import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const inputJsonl = path.join(__dirname, "questions.candidate.jsonl");
const manualQueueCsv = path.join(__dirname, "manual-review-queue.csv");
const metadataJson = path.join(__dirname, "generation-metadata.json");
const coverageCsv = path.join(__dirname, "coverage-matrix.csv");

const outputFiles = {
  json: path.join(__dirname, "independent-solvability-audit.json"),
  csv: path.join(__dirname, "independent-solvability-audit.csv"),
  md: path.join(__dirname, "independent-solvability-audit.md"),
  queue: path.join(__dirname, "independent-review-queue.csv"),
  manualResults: path.join(__dirname, "manual-review-results.csv"),
  finalDecision: path.join(__dirname, "final-review-decision.md")
};

const expectedTotal = 1200;
const grades = ["S4", "S5", "S6"];
const allowedTypes = ["multiple-choice", "fill-in", "short-answer"];
const allowedDifficulties = ["Foundation", "Core", "Challenge", "Exam"];

const requiredFields = [
  "id",
  "grade",
  "topicId",
  "topicTitleZhHans",
  "chapter",
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
  "sourceDistanceStatus",
  "mathQaStatus",
  "terminologyQaStatus",
  "generatorFamily",
  "generatorVariant",
  "reviewNotes"
];

const statusPriority = {
  pass: 0,
  "solver-gap": 1,
  "content-error": 2,
  "source-risk": 3,
  "terminology-risk": 4,
  "ambiguous-mc": 5,
  "answer-mismatch": 6
};

const forbiddenSourcePatterns = [
  { code: "source-ocr", regex: /\bOCR\b|光学字符识别|识别文本/i },
  { code: "source-file", regex: /\.pdf\b|\.docx\b|\.zip\b|\.jpg\b|\.png\b|PDF|DOCX|文件名|路径|source locator/iu },
  { code: "source-page", regex: /第\s*\d+\s*页|页码|页\s*\d+|P\.\s*\d+/i },
  { code: "source-original", regex: /教材原题|课本原题|试卷原题|高考真题|官方解析|答案原句|教材原文|课本原文|照抄|改编自|来源于/ },
  { code: "external-visual", regex: /如图(?:所示)?|见图|下图|上图|右图|左图|(?:^|[，。；：:\s])图中|根据图(?:形|表|像)?|观察下面的图/ }
];

const contentRedFlagPatterns = [
  { code: "invalid-placeholder", regex: /NaN|undefined|\+\-|\-\-/ },
  { code: "self-correction", regex: /重新计算|上面算错|前面错误|但选项|但题目|题目误写|题目有误|答案有误|原答案有误|选项应改|应改为|重新生成/ },
  { code: "under-specified", regex: /条件不足|无法确定|答案不唯一|不够条件|缺少图|缺少信息|选项中没有/ },
  { code: "model-artifact", regex: /作为AI|大语言模型|语言模型|模型输出|抱歉|根据输出要求|不能指出题目错误/ }
];

const traditionalChineseRiskPattern =
  /這|個|與|對|應|題|學|練|臺|裏|為|後|數|線|圓|證|體|關|聯|復|雜|選|項|難|點|錯|雙|歸|簡|標|準|範|圍|餘|變|參/;

function readJsonl(filePath) {
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        return { id: `__parse_error_${index + 1}`, parseError: String(error), rawLine: line };
      }
    });
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

function readCsv(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""').replace(/\r?\n/g, "\\n")}"` : text;
}

function writeCsv(filePath, rows, columns) {
  const lines = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))
  ];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = typeof keyFn === "function" ? keyFn(row) : row[keyFn];
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function gcd(first, second) {
  let a = Math.abs(first);
  let b = Math.abs(second);
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

function fraction(numerator, denominator) {
  if (denominator < 0) return fraction(-numerator, -denominator);
  const divisor = gcd(numerator, denominator);
  const n = numerator / divisor;
  const d = denominator / divisor;
  return d === 1 ? String(n) : `${n}/${d}`;
}

function factorial(value) {
  let result = 1;
  for (let factor = 2; factor <= value; factor += 1) result *= factor;
  return result;
}

function binomial(total, selected) {
  if (selected < 0 || selected > total) return 0;
  const k = Math.min(selected, total - selected);
  let numerator = 1;
  let denominator = 1;
  for (let index = 1; index <= k; index += 1) {
    numerator *= total - k + index;
    denominator *= index;
  }
  return numerator / denominator;
}

function normalize(value) {
  return String(value ?? "")
    .trim()
    .replace(/[！-～]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/　/g, " ")
    .replace(/−/g, "-")
    .replace(/×|·/g, "*")
    .replace(/÷/g, "/")
    .replace(/≤/g, "<=")
    .replace(/≥/g, ">=")
    .replace(/∞/g, "infty")
    .replace(/，|、|；|;/g, ",")
    .replace(/[。！？?!："“”'‘’\s]/g, "")
    .replace(/（/g, "(")
    .replace(/）/g, ")")
    .toLowerCase();
}

function numericValue(value) {
  const text = normalize(value);
  if (/^-?\d+(?:\.\d+)?$/.test(text)) return Number(text);
  const fractionMatch = text.match(/^(-?\d+)\/(-?\d+)$/);
  if (fractionMatch) return Number(fractionMatch[1]) / Number(fractionMatch[2]);
  return null;
}

function answerVariants(value) {
  const raw = String(value ?? "").trim();
  const normalized = normalize(raw);
  const variants = new Set([normalized]);
  variants.add(normalized.replace(/\+/g, ""));
  variants.add(normalized.replace(/根号/g, "√"));
  variants.add(normalized.replace(/sqrt/g, "√"));

  const number = numericValue(raw);
  if (number !== null) variants.add(String(Number(number.toFixed(10))));

  const fractionMatch = normalized.match(/^(-?\d+)\/(-?\d+)$/);
  if (fractionMatch) variants.add(fraction(Number(fractionMatch[1]), Number(fractionMatch[2])));

  const domainMatch = normalized.match(/^\[(-?\d+),\+?infty\)$/);
  if (domainMatch) variants.add(`x>=${domainMatch[1]}`);

  const intervalMatch = normalized.match(/^\[(-?\d+),(-?\d+)\]$/);
  if (intervalMatch) variants.add(`${intervalMatch[1]},${intervalMatch[2]}`);

  return variants;
}

function answersMatch(left, right) {
  const leftVariants = answerVariants(left);
  const rightVariants = answerVariants(right);
  for (const variant of leftVariants) {
    if (rightVariants.has(variant)) return true;
  }
  return false;
}

function anyAnswerMatches(expected, answers) {
  return answers.some((answer) => answersMatch(expected, answer));
}

function exactOneOptionMatches(expected, options) {
  return options.filter((option) => answersMatch(expected, option)).length === 1;
}

function questionText(row) {
  return [
    row.promptZhHans,
    ...(Array.isArray(row.optionsZhHans) ? row.optionsZhHans : []),
    row.answer,
    ...(Array.isArray(row.acceptedAnswers) ? row.acceptedAnswers : []),
    row.explanationZhHans,
    row.reviewNotes
  ].join("\n");
}

function matchOne(text, regex, label) {
  const match = text.match(regex);
  if (!match) throw new Error(`Cannot parse ${label}`);
  return match;
}

function numberFromSigned(text) {
  if (!text || text === "+") return 0;
  return Number(text);
}

function parseFactorTerm(term) {
  if (term === "x") return 0;
  const match = matchOne(term, /^x([+-]\d+)$/, "quadratic factor");
  return -Number(match[1]);
}

function parseComplex(value) {
  const match = matchOne(value, /(-?\d+)([+-]\d+)i/, "complex number");
  return { real: Number(match[1]), imaginary: Number(match[2]) };
}

function signed(value) {
  return value >= 0 ? `+${value}` : String(value);
}

function parseLinearFunction(prompt) {
  const match = matchOne(prompt, /([fg])\(x\)=(-?\d+)x([+-]\d+)/, "linear function");
  return { coefficient: Number(match[2]), constant: Number(match[3]) };
}

const solvers = {
  "integer-set-intersection": (row) => {
    const [, a, b, c, d] = matchOne(row.promptZhHans, /A=\{x∈Z \| (-?\d+)≤x≤(-?\d+)\}，B=\{x∈Z \| (-?\d+)≤x≤(-?\d+)\}/, row.generatorVariant).map(Number);
    return String(Math.max(0, Math.min(b, d) - Math.max(a, c) + 1));
  },
  "integer-set-union": (row) => {
    const [, a, b, c, d] = matchOne(row.promptZhHans, /A=\{x∈Z \| (-?\d+)≤x≤(-?\d+)\}，B=\{x∈Z \| (-?\d+)≤x≤(-?\d+)\}/, row.generatorVariant).map(Number);
    return String(Math.max(b, d) - Math.min(a, c) + 1);
  },
  "integer-set-difference": (row) => {
    const [, a, , c] = matchOne(row.promptZhHans, /A=\{x∈Z \| (-?\d+)≤x≤(-?\d+)\}，B=\{x∈Z \| (-?\d+)≤x≤(-?\d+)\}/, row.generatorVariant).map(Number);
    const values = Array.from({ length: Math.max(0, c - a) }, (_, index) => a + index);
    return `{${values.join(",")}}`;
  },
  "quadratic-inequality-interval": (row) => {
    const [, left, right] = matchOne(row.promptZhHans, /不等式\((x(?:[+-]\d+)?)\)\((x(?:[+-]\d+)?)\)≤0/, row.generatorVariant);
    const roots = [parseFactorTerm(left), parseFactorTerm(right)].sort((a, b) => a - b);
    return `[${roots[0]}, ${roots[1]}]`;
  },
  "quadratic-axis": (row) => {
    const [, left, right] = matchOne(row.promptZhHans, /y=\((x(?:[+-]\d+)?)\)\((x(?:[+-]\d+)?)\)/, row.generatorVariant);
    const roots = [parseFactorTerm(left), parseFactorTerm(right)];
    return String((roots[0] + roots[1]) / 2);
  },
  "quadratic-minimum": (row) => {
    const [, left, right] = matchOne(row.promptZhHans, /y=\((x(?:[+-]\d+)?)\)\((x(?:[+-]\d+)?)\)/, row.generatorVariant);
    const roots = [parseFactorTerm(left), parseFactorTerm(right)];
    const axis = (roots[0] + roots[1]) / 2;
    return String((axis - roots[0]) * (axis - roots[1]));
  },
  "linear-function-value": (row) => {
    const { coefficient, constant } = parseLinearFunction(row.promptZhHans);
    const [, x] = matchOne(row.promptZhHans, /f\((-?\d+)\)=/, row.generatorVariant).map(Number);
    return String(coefficient * x + constant);
  },
  "sqrt-domain": (row) => {
    const [, signedConstant] = matchOne(row.promptZhHans, /√\(x([+-]\d+)\)/, row.generatorVariant);
    return `[${-Number(signedConstant)}, +∞)`;
  },
  "linear-monotonicity": (row) => {
    const { coefficient } = parseLinearFunction(row.promptZhHans);
    return coefficient > 0 ? "在R上单调递增" : "在R上单调递减";
  },
  "log-power": (row) => {
    const [, base, powerBase, exponent] = matchOne(row.promptZhHans, /log_(\d+)\((\d+)\^(\d+)\)/, row.generatorVariant);
    if (base !== powerBase) throw new Error("log base mismatch");
    return exponent;
  },
  "exponential-equation": (row) => {
    const [, base, value] = matchOne(row.promptZhHans, /若(\d+)\^x=(\d+)/, row.generatorVariant).map(Number);
    let exponent = 0;
    let current = 1;
    while (current < value) {
      current *= base;
      exponent += 1;
    }
    if (current !== value) throw new Error("right side is not a power of base");
    return String(exponent);
  },
  "log-sum": (row) => {
    const [, base, left, right] = matchOne(row.promptZhHans, /log_(\d+)\((\d+)\)\+log_\d+\((\d+)\)/, row.generatorVariant).map(Number);
    const exponent = (value) => {
      let current = 1;
      let result = 0;
      while (current < value) {
        current *= base;
        result += 1;
      }
      if (current !== value) throw new Error("log argument is not exact base power");
      return result;
    };
    return String(exponent(left) + exponent(right));
  },
  "sine-period": (row) => {
    const [, k] = matchOne(row.promptZhHans, /sin\((\d+)x\)/, row.generatorVariant).map(Number);
    return { 1: "2π", 2: "π", 3: "2π/3", 4: "π/2" }[k];
  },
  "sine-amplitude": (row) => {
    const [, amplitude, shift = "+0"] = matchOne(row.promptZhHans, /y=(\d+)sin x([+-]\d+)?的最大值/, row.generatorVariant);
    return String(Number(amplitude) + numberFromSigned(shift));
  },
  "cosine-special-value": (row) => {
    const [, coefficient, shift = "+0"] = matchOne(row.promptZhHans, /求(\d+)cosα([+-]\d+)?的值/, row.generatorVariant);
    return fraction(Number(coefficient) + 2 * numberFromSigned(shift), 2);
  },
  "dot-product": (row) => {
    const [, ax, ay, bx, by] = matchOne(row.promptZhHans, /a=\((-?\d+),(-?\d+)\)，b=\((-?\d+),(-?\d+)\)/, row.generatorVariant).map(Number);
    return String(ax * bx + ay * by);
  },
  "vector-length-squared": (row) => {
    const [, ax, ay] = matchOne(row.promptZhHans, /a=\((-?\d+),(-?\d+)\)/, row.generatorVariant).map(Number);
    return String(ax * ax + ay * ay);
  },
  "vector-sum": (row) => {
    const [, ax, ay, bx, by] = matchOne(row.promptZhHans, /a=\((-?\d+),(-?\d+)\)，b=\((-?\d+),(-?\d+)\)/, row.generatorVariant).map(Number);
    return `(${ax + bx},${ay + by})`;
  },
  "complex-addition": (row) => {
    const [, z1, z2] = matchOne(row.promptZhHans, /z1=([^，]+)，z2=([^，]+)，则z1\+z2/, row.generatorVariant);
    const left = parseComplex(z1);
    const right = parseComplex(z2);
    return `${left.real + right.real}${signed(left.imaginary + right.imaginary)}i`;
  },
  "complex-modulus-squared": (row) => {
    const [, z] = matchOne(row.promptZhHans, /复数z=([^，]+)，则\|z\|\^2/, row.generatorVariant);
    const value = parseComplex(z);
    return String(value.real * value.real + value.imaginary * value.imaginary);
  },
  "complex-product": (row) => {
    const [, z1, z2] = matchOne(row.promptZhHans, /计算\(([^)]+)\)\(([^)]+)\)/, row.generatorVariant);
    const left = parseComplex(z1);
    const right = parseComplex(z2);
    return `${left.real * right.real - left.imaginary * right.imaginary}${signed(left.real * right.imaginary + left.imaginary * right.real)}i`;
  },
  "cuboid-volume": (row) => {
    const [, length, width, height] = matchOne(row.promptZhHans, /分别为(\d+)、(\d+)、(\d+)/, row.generatorVariant).map(Number);
    return String(length * width * height);
  },
  "cuboid-diagonal-squared": (row) => {
    const [, length, width, height] = matchOne(row.promptZhHans, /分别为(\d+)、(\d+)、(\d+)/, row.generatorVariant).map(Number);
    return String(length * length + width * width + height * height);
  },
  "cuboid-surface-area": (row) => {
    const [, length, width, height] = matchOne(row.promptZhHans, /长方体长(\d+)、宽(\d+)、高(\d+)/, row.generatorVariant).map(Number);
    return String(2 * (length * width + length * height + width * height));
  },
  "three-number-mean": (row) => {
    const values = matchOne(row.promptZhHans, /数据(-?\d+)，(-?\d+)，(-?\d+)/, row.generatorVariant).slice(1).map(Number);
    return String(values.reduce((sum, value) => sum + value, 0) / values.length);
  },
  "three-number-range": (row) => {
    const values = matchOne(row.promptZhHans, /数据(-?\d+)，(-?\d+)，(-?\d+)/, row.generatorVariant).slice(1).map(Number);
    return String(Math.max(...values) - Math.min(...values));
  },
  "mean-completion": (row) => {
    const [, first, second, third, mean] = matchOne(row.promptZhHans, /数据(-?\d+)，(-?\d+)，(-?\d+)再加入一个数后，四个数平均数为(-?\d+)/, row.generatorVariant).map(Number);
    return String(4 * mean - first - second - third);
  },
  "single-draw-red": (row) => {
    const [, red, blue] = matchOne(row.promptZhHans, /有(\d+)个红球和(\d+)个蓝球/, row.generatorVariant).map(Number);
    return fraction(red, red + blue);
  },
  "single-draw-blue": (row) => {
    const [, red, blue] = matchOne(row.promptZhHans, /有(\d+)个红球和(\d+)个蓝球/, row.generatorVariant).map(Number);
    return fraction(blue, red + blue);
  },
  "two-draw-red-then-blue": (row) => {
    const [, red, blue] = matchOne(row.promptZhHans, /有(\d+)个红球和(\d+)个蓝球/, row.generatorVariant).map(Number);
    return fraction(red * blue, (red + blue) * (red + blue - 1));
  },
  "space-vector-dot": (row) => {
    const [, ax, ay, az, bx, by, bz] = matchOne(row.promptZhHans, /a=\((-?\d+),(-?\d+),(-?\d+)\)，b=\((-?\d+),(-?\d+),(-?\d+)\)/, row.generatorVariant).map(Number);
    return String(ax * bx + ay * by + az * bz);
  },
  "space-vector-length-squared": (row) => {
    const [, ax, ay, az] = matchOne(row.promptZhHans, /a=\((-?\d+),(-?\d+),(-?\d+)\)/, row.generatorVariant).map(Number);
    return String(ax * ax + ay * ay + az * az);
  },
  "space-vector-sum": (row) => {
    const [, ax, ay, az, bx, by, bz] = matchOne(row.promptZhHans, /向量\((-?\d+),(-?\d+),(-?\d+)\)与\((-?\d+),(-?\d+),(-?\d+)\)/, row.generatorVariant).map(Number);
    return `(${ax + bx},${ay + by},${az + bz})`;
  },
  "line-slope": (row) => {
    const [, x1, y1, x2, y2] = matchOne(row.promptZhHans, /P\((-?\d+),(-?\d+)\)与Q\((-?\d+),(-?\d+)\)/, row.generatorVariant).map(Number);
    return fraction(y2 - y1, x2 - x1);
  },
  "circle-radius": (row) => {
    const [, rhs] = matchOne(row.promptZhHans, /\^2=(\d+)的半径/, row.generatorVariant).map(Number);
    return String(Math.sqrt(rhs));
  },
  "point-line-distance-numerator": (row) => {
    const [, x, y, constant] = matchOne(row.promptZhHans, /点C\((-?\d+),(-?\d+)\)到直线x\+y-(-?\d+)=0/, row.generatorVariant).map(Number);
    return String(Math.abs(x + y - constant));
  },
  "ellipse-c-squared": (row) => {
    const [, aSquared, bSquared] = matchOne(row.promptZhHans, /x\^2\/(\d+)\+y\^2\/(\d+)=1/, row.generatorVariant).map(Number);
    return String(aSquared - bSquared);
  },
  "parabola-p": (row) => {
    const [, coefficient] = matchOne(row.promptZhHans, /抛物线y\^2=(\d+)x/, row.generatorVariant).map(Number);
    return String(coefficient / 2);
  },
  "ellipse-focal-distance": (row) => {
    const [, aSquared, bSquared] = matchOne(row.promptZhHans, /x\^2\/(\d+)\+y\^2\/(\d+)=1/, row.generatorVariant).map(Number);
    return String(2 * Math.sqrt(aSquared - bSquared));
  },
  "arithmetic-nth-term": (row) => {
    const [, first, diff, index] = matchOne(row.promptZhHans, /首项a1=(-?\d+)，公差d=(-?\d+)，则a(\d+)/, row.generatorVariant).map(Number);
    return String(first + (index - 1) * diff);
  },
  "arithmetic-sum": (row) => {
    const [, first, index, nth] = matchOne(row.promptZhHans, /首项(-?\d+)、第(\d+)项(-?\d+)/, row.generatorVariant).map(Number);
    return String((index * (first + nth)) / 2);
  },
  "geometric-third-term": (row) => {
    const [, first, ratio] = matchOne(row.promptZhHans, /首项为(-?\d+)，公比为(-?\d+)/, row.generatorVariant).map(Number);
    return String(first * ratio * ratio);
  },
  "quadratic-derivative-value": (row) => {
    const [, a, b, x] = matchOne(row.promptZhHans, /f\(x\)=(-?\d+)x\^2([+-]\d+)x\+1，则f'\((-?\d+)\)/, row.generatorVariant).map(Number);
    return String(2 * a * x + b);
  },
  "quadratic-extreme-point": (row) => {
    const [, a, b] = matchOne(row.promptZhHans, /f\(x\)=(-?\d+)x\^2([+-]\d+)x\+1的极值点/, row.generatorVariant).map(Number);
    return fraction(-b, 2 * a);
  },
  "tangent-slope": (row) => {
    const [, a, b, x] = matchOne(row.promptZhHans, /y=(-?\d+)x\^2([+-]\d+)x\+1在x=(-?\d+)处/, row.generatorVariant).map(Number);
    return String(2 * a * x + b);
  },
  "combination-count": (row) => {
    const [, total, selected] = matchOne(row.promptZhHans, /从(\d+)名同学中选(\d+)名/, row.generatorVariant).map(Number);
    return String(binomial(total, selected));
  },
  "permutation-from-small-set": (row) => {
    const [, total] = matchOne(row.promptZhHans, /(\d+)个不同元素排成一列/, row.generatorVariant).map(Number);
    return String(factorial(total));
  },
  "binomial-coefficient": (row) => {
    const [, total, selected] = matchOne(row.promptZhHans, /\(1\+x\)\^(\d+)中x\^(\d+)项/, row.generatorVariant).map(Number);
    return String(binomial(total, selected));
  },
  "binomial-expectation": (row) => {
    const [, trials, numerator, denominator] = matchOne(row.promptZhHans, /X~B\((\d+), (\d+)\/(\d+)\)/, row.generatorVariant).map(Number);
    return fraction(trials * numerator, denominator);
  },
  "binomial-variance": (row) => {
    const [, trials, numerator, denominator] = matchOne(row.promptZhHans, /X~B\((\d+), (\d+)\/(\d+)\)/, row.generatorVariant).map(Number);
    return fraction(trials * numerator * (denominator - numerator), denominator * denominator);
  },
  "two-point-expectation": (row) => {
    const [, value, numerator, denominator] = matchOne(row.promptZhHans, /Y取(\d+)的概率为(\d+)\/(\d+)/, row.generatorVariant).map(Number);
    return fraction(value * numerator, denominator);
  },
  "linear-regression-prediction": (row) => {
    const [, slope, intercept, x] = matchOne(row.promptZhHans, /ŷ=(-?\d+)x([+-]\d+)，当x=(-?\d+)/, row.generatorVariant).map(Number);
    return String(slope * x + intercept);
  },
  "regression-residual": (row) => {
    const [, predicted, observed] = matchOne(row.promptZhHans, /回归预测值为(-?\d+)，实际观测值为(-?\d+)/, row.generatorVariant).map(Number);
    return String(observed - predicted);
  },
  "regression-through-means": (row) => {
    const [, slope, intercept, xMean] = matchOne(row.promptZhHans, /回归直线ŷ=(-?\d+)x([+-]\d+)经过.*若x̄=(-?\d+)/, row.generatorVariant).map(Number);
    return String(slope * xMean + intercept);
  },
  "cubic-critical-points": (row) => {
    const [, coefficient] = matchOne(row.promptZhHans, /f\(x\)=x\^3-(\d+)x的导函数零点/, row.generatorVariant).map(Number);
    const p = coefficient / 3;
    return p === 1 ? "x=±1" : `x=±√${p}`;
  },
  "cubic-derivative-value": (row) => {
    const [, coefficient, x] = matchOne(row.promptZhHans, /f\(x\)=x\^3-(\d+)x，则f'\((-?\d+)\)/, row.generatorVariant).map(Number);
    return String(3 * x * x - coefficient);
  },
  "cubic-tangent-slope": (row) => {
    const [, coefficient, x] = matchOne(row.promptZhHans, /y=x\^3-(\d+)x在x=(-?\d+)处/, row.generatorVariant).map(Number);
    return String(3 * x * x - coefficient);
  },
  "circle-tangent-line": (row) => {
    const [, x, , radius] = matchOne(row.promptZhHans, /圆心为\((-?\d+),(-?\d+)\)、半径为(\d+)/, row.generatorVariant).map(Number);
    return String(x + radius);
  },
  "center-to-vertical-line-distance": (row) => {
    const [, x, , lineX] = matchOne(row.promptZhHans, /点\((-?\d+),(-?\d+)\)到直线x=(-?\d+)/, row.generatorVariant).map(Number);
    return String(Math.abs(x - lineX));
  },
  "circle-standard-equation": (row) => {
    const [, x, y, radius] = matchOne(row.promptZhHans, /圆心\((-?\d+),(-?\d+)\)、半径(\d+)/, row.generatorVariant).map(Number);
    const xTerm = x > 0 ? `x-${x}` : `x+${Math.abs(x)}`;
    const yTerm = y > 0 ? `y-${y}` : `y+${Math.abs(y)}`;
    return `(${xTerm})^2+(${yTerm})^2=${radius * radius}`;
  },
  "binomial-one-success": (row) => {
    const [, trials, numerator, denominator] = matchOne(row.promptZhHans, /X~B\((\d+), (\d+)\/(\d+)\).*P\(X=1\)/, row.generatorVariant).map(Number);
    return fraction(binomial(trials, 1) * numerator * (denominator - numerator) ** (trials - 1), denominator ** trials);
  },
  "binomial-expected-value": (row) => {
    const [, trials, numerator, denominator] = matchOne(row.promptZhHans, /X~B\((\d+), (\d+)\/(\d+)\)/, row.generatorVariant).map(Number);
    return fraction(trials * numerator, denominator);
  },
  "frequency-interpretation": (row) => {
    const [, total, expected] = matchOne(row.promptZhHans, /在(\d+)次独立重复试验中期望发生(\d+)次/, row.generatorVariant).map(Number);
    return fraction(expected, total);
  }
};

function solve(row) {
  const solver = solvers[row.generatorVariant];
  if (!solver) return { status: "solver-gap", independentAnswer: "", notes: [`missing solver for ${row.generatorVariant}`] };
  try {
    const independentAnswer = solver(row);
    return { status: "pass", independentAnswer, notes: [] };
  } catch (error) {
    return { status: "solver-gap", independentAnswer: "", notes: [String(error?.message ?? error)] };
  }
}

function strongestStatus(statuses) {
  return statuses.sort((left, right) => statusPriority[right] - statusPriority[left])[0] ?? "pass";
}

function auditRow(row, manualIds) {
  const statuses = [];
  const notes = [];
  const text = questionText(row);
  const sourceRiskCodes = forbiddenSourcePatterns.filter((pattern) => pattern.regex.test(text)).map((pattern) => pattern.code);
  const contentRiskCodes = contentRedFlagPatterns.filter((pattern) => pattern.regex.test(text)).map((pattern) => pattern.code);

  if (row.parseError) {
    return {
      id: row.id,
      grade: row.grade ?? "",
      topicId: row.topicId ?? "",
      type: row.type ?? "",
      difficulty: row.difficulty ?? "",
      generatorFamily: row.generatorFamily ?? "",
      generatorVariant: row.generatorVariant ?? "",
      independentAnswer: "",
      storedAnswer: row.answer ?? "",
      status: "content-error",
      reviewReason: "parse-error",
      notes: row.parseError
    };
  }

  for (const field of requiredFields) {
    if (row[field] === undefined || row[field] === null || row[field] === "") {
      statuses.push("content-error");
      notes.push(`missing field ${field}`);
    }
  }

  if (!grades.includes(row.grade)) {
    statuses.push("content-error");
    notes.push(`unexpected grade ${row.grade}`);
  }
  if (!allowedTypes.includes(row.type)) {
    statuses.push("content-error");
    notes.push(`unexpected type ${row.type}`);
  }
  if (!allowedDifficulties.includes(row.difficulty)) {
    statuses.push("content-error");
    notes.push(`unexpected difficulty ${row.difficulty}`);
  }
  if (!Array.isArray(row.optionsZhHans)) {
    statuses.push("content-error");
    notes.push("optionsZhHans is not an array");
  }
  if (!Array.isArray(row.acceptedAnswers) || !row.acceptedAnswers.some((answer) => answersMatch(row.answer, answer))) {
    statuses.push("content-error");
    notes.push("acceptedAnswers does not include stored answer");
  }
  if (!Array.isArray(row.evidenceCardIds) || !row.evidenceCardIds.length) {
    statuses.push("content-error");
    notes.push("missing evidence card");
  }

  if (row.type === "multiple-choice") {
    const options = Array.isArray(row.optionsZhHans) ? row.optionsZhHans : [];
    if (options.length !== 4 || new Set(options.map(normalize)).size !== 4) {
      statuses.push("ambiguous-mc");
      notes.push("multiple-choice options are not four unique options");
    }
    if (options.filter((option) => answersMatch(row.answer, option)).length !== 1) {
      statuses.push("ambiguous-mc");
      notes.push("stored answer does not match exactly one option");
    }
  } else if (Array.isArray(row.optionsZhHans) && row.optionsZhHans.length) {
    statuses.push("content-error");
    notes.push(`${row.type} should not include options`);
  }

  if (sourceRiskCodes.length) {
    statuses.push("source-risk");
    notes.push(`source risk: ${sourceRiskCodes.join("|")}`);
  }
  if (traditionalChineseRiskPattern.test(text)) {
    statuses.push("terminology-risk");
    notes.push("possible Traditional Chinese terminology");
  }
  if (contentRiskCodes.length) {
    statuses.push("content-error");
    notes.push(`content red flag: ${contentRiskCodes.join("|")}`);
  }

  const solved = solve(row);
  if (solved.status !== "pass") {
    statuses.push(solved.status);
    notes.push(...solved.notes);
  } else {
    const answers = [row.answer, ...(Array.isArray(row.acceptedAnswers) ? row.acceptedAnswers : [])];
    if (!anyAnswerMatches(solved.independentAnswer, answers)) {
      statuses.push("answer-mismatch");
      notes.push(`independent answer ${solved.independentAnswer} does not match stored answer ${row.answer}`);
    }
    if (row.type === "multiple-choice" && !exactOneOptionMatches(solved.independentAnswer, row.optionsZhHans ?? [])) {
      statuses.push("ambiguous-mc");
      notes.push(`independent answer ${solved.independentAnswer} does not match exactly one option`);
    }
  }

  const status = statuses.length ? strongestStatus(statuses) : "pass";
  const reviewReason =
    status === "pass" && manualIds.has(row.id)
      ? "topic-balanced-s18-sample"
      : status === "pass"
        ? ""
        : `auto-${status}`;

  return {
    id: row.id,
    grade: row.grade,
    topicId: row.topicId,
    type: row.type,
    difficulty: row.difficulty,
    generatorFamily: row.generatorFamily,
    generatorVariant: row.generatorVariant,
    independentAnswer: solved.independentAnswer,
    storedAnswer: row.answer,
    status,
    reviewReason,
    notes: notes.length ? notes.join("; ") : "OK"
  };
}

function validateInventory(rows, metadata, coverageRows) {
  const issues = [];
  const ids = countBy(rows, "id");
  const prompts = countBy(rows, (row) => row.promptZhHans);
  if (rows.length !== expectedTotal) issues.push(`total rows ${rows.length} != ${expectedTotal}`);
  for (const [id, count] of Object.entries(ids)) {
    if (count > 1) issues.push(`duplicate id ${id}`);
  }
  for (const [prompt, count] of Object.entries(prompts)) {
    if (count > 1) issues.push(`duplicate prompt ${prompt.slice(0, 80)}`);
  }

  const gradeCounts = countBy(rows, "grade");
  const gradeTypeCounts = countBy(rows, (row) => `${row.grade}-${row.type}`);
  const gradeDifficultyCounts = countBy(rows, (row) => `${row.grade}-${row.difficulty}`);
  const topicCounts = countBy(rows, "topicId");

  for (const [grade, expected] of Object.entries(metadata.quotas.typeQuotas)) {
    const gradeTotal = Object.values(expected).reduce((sum, value) => sum + value, 0);
    if ((gradeCounts[grade] ?? 0) !== gradeTotal) issues.push(`${grade} count ${gradeCounts[grade] ?? 0} != ${gradeTotal}`);
    for (const [type, count] of Object.entries(expected)) {
      if ((gradeTypeCounts[`${grade}-${type}`] ?? 0) !== count) issues.push(`${grade}-${type} count mismatch`);
    }
  }
  for (const [grade, expected] of Object.entries(metadata.quotas.difficultyQuotas)) {
    for (const [difficulty, count] of Object.entries(expected)) {
      if ((gradeDifficultyCounts[`${grade}-${difficulty}`] ?? 0) !== count) issues.push(`${grade}-${difficulty} count mismatch`);
    }
  }
  for (const [topicId, count] of Object.entries(metadata.quotas.topicCountsById)) {
    if ((topicCounts[topicId] ?? 0) !== count) issues.push(`${topicId} count ${topicCounts[topicId] ?? 0} != ${count}`);
  }
  for (const row of coverageRows) {
    if (!row.topicId) continue;
    const actual = topicCounts[row.topicId] ?? 0;
    if (actual !== Number(row.actualTotal)) issues.push(`${row.topicId} count ${actual} != coverage matrix ${row.actualTotal}`);
  }

  return {
    issues,
    duplicateIdCount: Object.values(ids).filter((count) => count > 1).length,
    duplicatePromptCount: Object.values(prompts).filter((count) => count > 1).length,
    gradeCounts,
    gradeTypeCounts,
    gradeDifficultyCounts,
    topicCounts
  };
}

function buildReviewQueue(rows, auditRows, manualRows) {
  const byId = new Map();
  for (const row of auditRows.filter((auditRow) => auditRow.status !== "pass")) {
    const source = rows.find((candidate) => candidate.id === row.id) ?? {};
    byId.set(row.id, { reviewReason: row.reviewReason, ...source, auditStatus: row.status, independentAnswer: row.independentAnswer, auditNotes: row.notes });
  }
  for (const manualRow of manualRows) {
    const source = rows.find((candidate) => candidate.id === manualRow.id) ?? manualRow;
    const auditRow = auditRows.find((candidate) => candidate.id === manualRow.id);
    byId.set(manualRow.id, {
      reviewReason: byId.get(manualRow.id)?.reviewReason ?? manualRow.reviewReason ?? "topic-balanced-s18-sample",
      ...source,
      auditStatus: auditRow?.status ?? "pass",
      independentAnswer: auditRow?.independentAnswer ?? "",
      auditNotes: auditRow?.notes ?? "manual sample"
    });
  }
  return Array.from(byId.values()).sort((left, right) =>
    String(left.grade).localeCompare(String(right.grade)) ||
    String(left.topicId).localeCompare(String(right.topicId)) ||
    String(left.id).localeCompare(String(right.id))
  );
}

function buildManualResults(queueRows, previousRows = []) {
  const previousById = new Map(previousRows.map((row) => [row.id, row]));
  return queueRows.map((row) => ({
    reviewReason: row.reviewReason,
    id: row.id,
    grade: row.grade,
    topicId: row.topicId,
    type: row.type,
    difficulty: row.difficulty,
    generatorFamily: row.generatorFamily,
    generatorVariant: row.generatorVariant,
    auditStatus: row.auditStatus,
    independentAnswer: row.independentAnswer,
    storedAnswer: row.answer,
    manualStatus: previousById.get(row.id)?.manualStatus || "pending",
    mathCorrect: previousById.get(row.id)?.mathCorrect || "",
    curriculumFit: previousById.get(row.id)?.curriculumFit || "",
    wordingNatural: previousById.get(row.id)?.wordingNatural || "",
    sourceSafe: previousById.get(row.id)?.sourceSafe || "",
    fixRecommendation: previousById.get(row.id)?.fixRecommendation || "",
    reviewerNotes: previousById.get(row.id)?.reviewerNotes || ""
  }));
}

function markdownReport({ summary, inventory, auditRows, queueRows }) {
  const statusCounts = countBy(auditRows, "status");
  const gradeStatusCounts = countBy(auditRows, (row) => `${row.grade}-${row.status}`);
  const typeStatusCounts = countBy(auditRows, (row) => `${row.type}-${row.status}`);
  const topicStatusCounts = countBy(auditRows, (row) => `${row.topicId}-${row.status}`);
  const failingRows = auditRows.filter((row) => row.status !== "pass");

  return [
    "# Mainland PEP High Hybrid 1200 Independent Solvability Audit",
    "",
    "- Date: 2026-05-23",
    "- Session ID: S18",
    "- Input: `questions.candidate.jsonl`",
    "- Scope: candidate-only independent answer recomputation; no production integration",
    "- Source-safety note: no live LLM, OCR, textbook body text, exam stem, official solution, source locator, image, or external question bank used.",
    "",
    "## Executive Summary",
    "",
    `- Total rows: ${summary.totalRows}`,
    `- Attempted rows: ${summary.attemptedRows}`,
    `- Pass rows: ${summary.passRows}`,
    `- Failing rows: ${summary.failingRows}`,
    `- Duplicate IDs: ${inventory.duplicateIdCount}`,
    `- Duplicate exact prompts: ${inventory.duplicatePromptCount}`,
    `- Inventory issues: ${inventory.issues.length}`,
    `- Independent review queue rows: ${queueRows.length}`,
    `- Manual pending rows: ${summary.manualPendingRows}`,
    `- Release recommendation: ${summary.releaseRecommendation}`,
    "",
    "## Status Counts",
    "",
    "| Status | Count |",
    "| --- | ---: |",
    ...Object.entries(statusCounts).sort().map(([status, count]) => `| ${status} | ${count} |`),
    "",
    "## Grade Status Counts",
    "",
    "| Grade | Pass | Non-pass |",
    "| --- | ---: | ---: |",
    ...grades.map((grade) => {
      const pass = gradeStatusCounts[`${grade}-pass`] ?? 0;
      const total = auditRows.filter((row) => row.grade === grade).length;
      return `| ${grade} | ${pass} | ${total - pass} |`;
    }),
    "",
    "## Type Status Counts",
    "",
    "| Type | Pass | Non-pass |",
    "| --- | ---: | ---: |",
    ...allowedTypes.map((type) => {
      const pass = typeStatusCounts[`${type}-pass`] ?? 0;
      const total = auditRows.filter((row) => row.type === type).length;
      return `| ${type} | ${pass} | ${total - pass} |`;
    }),
    "",
    "## Topic Status Counts",
    "",
    "| Topic | Pass | Non-pass |",
    "| --- | ---: | ---: |",
    ...Object.keys(summary.topicCounts).sort().map((topicId) => {
      const pass = topicStatusCounts[`${topicId}-pass`] ?? 0;
      const total = summary.topicCounts[topicId] ?? 0;
      return `| ${topicId} | ${pass} | ${total - pass} |`;
    }),
    "",
    "## Inventory Issues",
    "",
    inventory.issues.length ? inventory.issues.map((issue) => `- ${issue}`).join("\n") : "- None.",
    "",
    "## Non-Pass Rows",
    "",
    failingRows.length
      ? [
          "| ID | Status | Independent | Stored | Notes |",
          "| --- | --- | --- | --- | --- |",
          ...failingRows.map((row) => `| ${row.id} | ${row.status} | ${row.independentAnswer} | ${row.storedAnswer} | ${String(row.notes).replace(/\|/g, "/")} |`)
        ].join("\n")
      : "- None.",
    "",
    "## Human Review Requirement",
    "",
    summary.manualPendingRows
      ? "- Complete every row in `manual-review-results.csv` before promotion."
      : "- S18 manual review queue is complete; no pending manual-review rows remain.",
    "- Do not use manual notes to bypass solver gaps; fix the solver or candidate row and rerun this audit.",
    "- Public integration is not performed by this S18 package audit; S04/S08/S11 still need an explicit owner-approved integration task before student-facing use.",
    ""
  ].join("\n");
}

function finalDecision(summary, manualResults) {
  const allManualApproved = manualResults.length > 0 && manualResults.every((row) => row.manualStatus === "approved");
  const decision = summary.failingRows > 0
    ? "blocked-auto-qa"
    : allManualApproved
      ? "approved-for-promotion-review"
      : "blocked-human-review";

  return [
    "# Final Review Decision: Mainland PEP High Hybrid 1200",
    "",
    `- Decision: ${decision}`,
    "- Public integration: not performed by S18; separate owner-approved S04/S08/S11 integration task required before student-facing use",
    `- Automatic pass rows: ${summary.passRows} / ${summary.totalRows}`,
    `- Automatic failing rows: ${summary.failingRows}`,
    `- Manual review rows: ${manualResults.length}`,
    `- Manual pending rows: ${manualResults.filter((row) => row.manualStatus !== "approved").length}`,
    "",
    "## Rationale",
    "",
    summary.failingRows > 0
      ? "Automatic independent solvability QA found non-pass rows. Fix candidate rows or solver gaps and rerun before human promotion review."
      : allManualApproved
        ? "Automatic independent solvability QA passed all candidate rows, and S18 manual topic-balanced sample review is complete. This clears the S18 content QA gate for promotion planning, but it does not perform or authorize production/public integration."
        : "Automatic independent solvability QA passed all candidate rows. Promotion remains blocked until S18 completes the manual review queue.",
    "",
    "## Next Safe Step",
    "",
    allManualApproved
      ? "- Request a separate owner-approved S04/S08/S11 production integration task before wiring this package into public question-bank surfaces."
      : "- Fill `manual-review-results.csv` after S18 human review.",
    "- Rerun `node coordination/content-qa/mainland-pep-high-hybrid-1200-v1/audit-independent-solvability.mjs` after any fixes or manual-review update.",
    ""
  ].join("\n");
}

function main() {
  const rows = readJsonl(inputJsonl);
  const manualRows = readCsv(manualQueueCsv);
  const previousManualResults = readCsv(outputFiles.manualResults);
  const metadata = JSON.parse(fs.readFileSync(metadataJson, "utf8"));
  const coverageRows = readCsv(coverageCsv);
  const manualIds = new Set(manualRows.map((row) => row.id));

  const inventory = validateInventory(rows, metadata, coverageRows);
  const auditRows = rows.map((row) => auditRow(row, manualIds));
  const failingRows = auditRows.filter((row) => row.status !== "pass");
  const queueRows = buildReviewQueue(rows, auditRows, manualRows);
  const manualResults = buildManualResults(queueRows, previousManualResults);
  const manualPendingRows = manualResults.filter((row) => row.manualStatus !== "approved").length;
  const summary = {
    totalRows: rows.length,
    attemptedRows: auditRows.filter((row) => row.independentAnswer || row.status !== "solver-gap").length,
    passRows: auditRows.filter((row) => row.status === "pass").length,
    failingRows: failingRows.length,
    manualRows: manualResults.length,
    manualPendingRows,
    statusCounts: countBy(auditRows, "status"),
    gradeCounts: countBy(rows, "grade"),
    typeCounts: countBy(rows, "type"),
    topicCounts: countBy(rows, "topicId"),
    releaseRecommendation: failingRows.length || inventory.issues.length
      ? "blocked-auto-qa"
      : manualPendingRows
        ? "blocked-human-review"
        : "approved-for-promotion-review"
  };

  const csvColumns = [
    "id",
    "grade",
    "topicId",
    "type",
    "difficulty",
    "generatorFamily",
    "generatorVariant",
    "independentAnswer",
    "storedAnswer",
    "status",
    "reviewReason",
    "notes"
  ];
  writeCsv(outputFiles.csv, auditRows, csvColumns);
  fs.writeFileSync(outputFiles.json, `${JSON.stringify({ summary, inventory, rows: auditRows }, null, 2)}\n`, "utf8");
  fs.writeFileSync(outputFiles.md, markdownReport({ summary, inventory, auditRows, queueRows }), "utf8");

  const queueColumns = [
    "reviewReason",
    "id",
    "grade",
    "topicId",
    "topicTitleZhHans",
    "chapter",
    "difficulty",
    "type",
    "promptZhHans",
    "optionsZhHans",
    "answer",
    "acceptedAnswers",
    "explanationZhHans",
    "generatorFamily",
    "generatorVariant",
    "auditStatus",
    "independentAnswer",
    "auditNotes"
  ];
  writeCsv(outputFiles.queue, queueRows, queueColumns);

  const manualColumns = [
    "reviewReason",
    "id",
    "grade",
    "topicId",
    "type",
    "difficulty",
    "generatorFamily",
    "generatorVariant",
    "auditStatus",
    "independentAnswer",
    "storedAnswer",
    "manualStatus",
    "mathCorrect",
    "curriculumFit",
    "wordingNatural",
    "sourceSafe",
    "fixRecommendation",
    "reviewerNotes"
  ];
  writeCsv(outputFiles.manualResults, manualResults, manualColumns);
  fs.writeFileSync(outputFiles.finalDecision, finalDecision(summary, manualResults), "utf8");

  console.log(JSON.stringify({
    status: summary.releaseRecommendation,
    totalRows: summary.totalRows,
    attemptedRows: summary.attemptedRows,
    passRows: summary.passRows,
    failingRows: summary.failingRows,
    inventoryIssues: inventory.issues.length,
    independentReviewQueueRows: queueRows.length
  }, null, 2));

  if (summary.failingRows || inventory.issues.length) process.exitCode = 1;
}

main();
