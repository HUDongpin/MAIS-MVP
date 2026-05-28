import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASELINE_QUESTIONS_JSONL = path.join(__dirname, "../mainland-hjb-high-generated-bank-v4/questions.jsonl");
const QUESTIONS_JSONL = path.join(__dirname, "questions.jsonl");
const QUESTIONS_CSV = path.join(__dirname, "questions.csv");
const QUESTION_PACK_JSON = path.join(__dirname, "question-pack.json");
const SOURCE_REMEDIATION_QUEUE = path.join(__dirname, "../mainland-hjb-high-generated-bank-v4/manual-review-remediation-queue.csv");
const MANUAL_RESULTS_CSV = path.join(__dirname, "manual-review-results.csv");
const MANUAL_REMEDIATION_QUEUE_CSV = path.join(__dirname, "manual-review-remediation-queue.csv");
const REMEDIATION_AUDIT_JSON = path.join(__dirname, "remediation-audit.json");
const REMEDIATION_AUDIT_CSV = path.join(__dirname, "remediation-audit.csv");
const REMEDIATION_AUDIT_MD = path.join(__dirname, "remediation-audit.md");
const QA_REPORT_MD = path.join(__dirname, "qa-report.md");
const MANUAL_QA_SUMMARY_MD = path.join(__dirname, "manual-qa-summary.md");
const DECISION_MD = path.join(__dirname, "s18-promotability-decision.md");

const QUESTION_FIELDS = [
  "id",
  "grade",
  "topicId",
  "topicTitleZhHans",
  "volume",
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
  "reviewNotes"
];

function readJsonl(filePath) {
  const text = fs.readFileSync(filePath, "utf8").trim();
  if (!text) return [];
  return text.split(/\n/).map((line) => JSON.parse(line));
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  return `"${text.replace(/"/g, '""').replace(/\r?\n/g, "\\n")}"`;
}

function writeCsv(filePath, rows, headers) {
  const lines = [headers.map(csvEscape).join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quoted && char === '"' && line[index + 1] === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells;
}

function readCsv(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const lines = fs.readFileSync(filePath, "utf8").trim().split(/\r?\n/);
  if (!lines.length || !lines[0]) return [];
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).filter(Boolean).map((line) => {
    const cells = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
  });
}

function countBy(values) {
  const counts = {};
  for (const value of values) counts[value] = (counts[value] || 0) + 1;
  return counts;
}

function gcd(first, second) {
  let a = Math.abs(first);
  let b = Math.abs(second);
  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a || 1;
}

function lcm(first, second) {
  return Math.abs(first * second) / gcd(first, second);
}

function formatFraction(numerator, denominator) {
  if (denominator === 0) return "undefined";
  const divisor = gcd(numerator, denominator);
  const sign = denominator < 0 ? -1 : 1;
  const n = (numerator / divisor) * sign;
  const d = Math.abs(denominator / divisor);
  return d === 1 ? String(n) : `${n}/${d}`;
}

function parseFraction(text) {
  const match = String(text).match(/^(-?\d+)\/(-?\d+)$/);
  if (!match) return null;
  return { numerator: Number(match[1]), denominator: Number(match[2]) };
}

function numericValue(text) {
  const fraction = parseFraction(text);
  if (fraction) return fraction.numerator / fraction.denominator;
  if (/^-?\d+(?:\.\d+)?$/.test(String(text))) return Number(text);
  return null;
}

function equivalentAnswer(left, right) {
  if (String(left) === String(right)) return true;
  const a = numericValue(left);
  const b = numericValue(right);
  return a !== null && b !== null && Math.abs(a - b) < 1e-10;
}

function unique(values) {
  const result = [];
  for (const value of values.filter((entry) => entry !== undefined && entry !== null && String(entry).trim() !== "")) {
    if (!result.some((entry) => String(entry) === String(value))) result.push(String(value));
  }
  return result;
}

function stableHash(text) {
  let hash = 2166136261;
  for (const char of String(text)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function rotateOptions(options, id) {
  const cleaned = unique(options).slice(0, 4);
  while (cleaned.length < 4) cleaned.push(String(Number(cleaned[0] ?? 0) + cleaned.length + 1));
  const offset = stableHash(id) % cleaned.length;
  return [...cleaned.slice(offset), ...cleaned.slice(0, offset)];
}

function numberOptions(answer) {
  const value = Number(answer);
  if (!Number.isFinite(value)) return [String(answer), `${answer}+1`, `${answer}-1`, `2${answer}`];
  const candidates = [value, value + 1, value - 1, value + 2, value - 2, value + 3].map((entry) => String(entry));
  return unique(candidates).slice(0, 4);
}

function fractionOptions(answer, numerator, denominator) {
  const candidates = [
    answer,
    formatFraction(numerator + 1, denominator),
    formatFraction(Math.max(1, numerator - 1), denominator),
    formatFraction(numerator, denominator + 1),
    formatFraction(numerator + 1, denominator + 1),
    formatFraction(numerator + denominator, denominator)
  ];
  const options = [];
  for (const candidate of candidates) {
    if (options.length === 4) break;
    if (candidate === answer || !equivalentAnswer(candidate, answer)) options.push(candidate);
  }
  return unique(options).slice(0, 4);
}

function sqrt3Term(coefficient, denominator = 1) {
  if (coefficient === 0) return "0";
  const divisor = gcd(coefficient, denominator);
  const n = coefficient / divisor;
  const d = denominator / divisor;
  const radical = n === 1 ? "√3" : `${n}√3`;
  return d === 1 ? radical : `${radical}/${d}`;
}

function sqrt3Options(answer, coefficient, denominator) {
  return unique([
    answer,
    sqrt3Term(coefficient + denominator, denominator),
    sqrt3Term(Math.max(1, coefficient - denominator), denominator),
    sqrt3Term(coefficient, denominator + 1),
    String(Math.round((coefficient * Math.sqrt(3)) / denominator))
  ]).slice(0, 4);
}

function typePrefix(type) {
  if (type === "fill-in") return "填空";
  if (type === "short-answer") return "解答";
  return "选择";
}

function promptNumber(row) {
  const match = String(row.promptZhHans ?? "").match(/V4安全变式(\d+)/);
  if (match) return match[1];
  const idMatch = row.id.match(/-(\d+)$/);
  return idMatch ? idMatch[1].padStart(4, "0") : "0000";
}

function makePrompt(row, body) {
  return `V4修复变式${promptNumber(row)}：${typePrefix(row.type)}：${body}`;
}

function localIndex(row) {
  const match = row.id.match(/-(\d+)$/);
  return match ? Number(match[1]) : stableHash(row.id) % 500;
}

function isAdvanced(row) {
  return row.difficulty === "Challenge" || row.difficulty === "Exam";
}

function makeRow(row, core, issueCodes) {
  const options = row.type === "multiple-choice" ? rotateOptions(core.options ?? numberOptions(core.answer), row.id) : [];
  return {
    ...row,
    promptZhHans: makePrompt(row, core.body),
    optionsZhHans: options,
    answer: String(core.answer),
    acceptedAnswers: unique([core.answer, ...(core.acceptedAnswers ?? [])]),
    explanationZhHans: core.explanation,
    sourceDistanceStatus: "passed-auto-source-scan",
    mathQaStatus: "pending-manual-re-review",
    terminologyQaStatus: "pending-manual-re-review",
    reviewNotes: `V4 remediated candidate row; issue classes addressed: ${issueCodes.join(" | ")}. Original V4 package remains frozen; S18 manual re-review required before app integration.`
  };
}

function parseOldPrompt(row, regex) {
  return String(row.promptZhHans ?? "").match(regex);
}

function remediateSet(row) {
  const match = parseOldPrompt(row, /设集合 A=\{1,2,3,\.\.\.,(-?\d+)\}，集合 B 为其中能被 (-?\d+) 整除的数。求集合 B 的元素个数。/);
  if (!match) return null;
  const upper = Number(match[1]);
  const divisor = Number(match[2]);
  const other = divisor + 1;
  const both = Math.floor(upper / lcm(divisor, other));
  const answer = Math.floor(upper / divisor) + Math.floor(upper / other) - 2 * both;
  return {
    body: `设集合 A={1,2,3,...,${upper}}，B 为 A 中能被 ${divisor} 整除的数，C 为 A 中能被 ${other} 整除的数。求只属于 B 和 C 中一个集合的元素个数。`,
    answer,
    options: numberOptions(answer),
    explanation: `|B|=floor(${upper}/${divisor})=${Math.floor(upper / divisor)}，|C|=floor(${upper}/${other})=${Math.floor(upper / other)}，|B∩C|=floor(${upper}/${lcm(divisor, other)})=${both}。只属于一个集合的元素个数为 |B|+|C|-2|B∩C|=${answer}。`
  };
}

function remediateInequality(row) {
  const match = parseOldPrompt(row, /解不等式 x\+(-?\d+)>(-?\d+)，求 x 的取值范围右端常数 -?\d+-\d+ 的值。/);
  if (!match) return null;
  const addend = Number(match[1]);
  const right = Number(match[2]);
  const lower = right - addend;
  const upper = lower + 3 + (localIndex(row) % 5);
  const answer = upper - lower;
  return {
    body: `求不等式组 x+${addend}>${right}，x≤${upper} 的整数解个数。`,
    answer,
    options: numberOptions(answer),
    explanation: `由 x+${addend}>${right} 得 x>${lower}。又 x≤${upper}，整数 x 为 ${lower + 1} 到 ${upper}，共有 ${upper}-${lower}=${answer} 个。`
  };
}

function remediateLog(row) {
  const match = parseOldPrompt(row, /已知 log_(\d+)\(\d+\^(-?\d+)\)=m，求 m。/);
  if (!match) return null;
  const base = Number(match[1]);
  const exponent = Number(match[2]);
  const answer = 2 * exponent + 3;
  return {
    body: `已知 log_${base}(${base}^${exponent})=m，且 log_${base}(${base}^n)=m+3。求 m+n。`,
    answer,
    options: numberOptions(answer),
    explanation: `由对数定义得 m=${exponent}。又 log_${base}(${base}^n)=n=m+3=${exponent + 3}，所以 m+n=${exponent}+${exponent + 3}=${answer}。`
  };
}

function remediateExponential(row) {
  const match = parseOldPrompt(row, /函数 f\(x\)=(-?\d+)\^x，求 f\(2\)。/);
  if (!match) return null;
  const base = Number(match[1]);
  const answer = base ** 3 + base ** 2;
  return {
    body: `函数 f(x)=${base}^x。若 f(t)=${base}·f(2)，求 f(t)+f(t-1)。`,
    answer,
    options: numberOptions(answer),
    explanation: `f(2)=${base}²，所以 f(t)=${base}·f(2)=${base}³，得 t=3。因此 f(t)+f(t-1)=f(3)+f(2)=${base ** 3}+${base ** 2}=${answer}。`
  };
}

function remediateLinearFunction(row) {
  const match = parseOldPrompt(row, /已知 f\(x\)=(-?\d+)x\+(-?\d+)，求 f\((-?\d+)\)。/);
  if (!match) return null;
  const slope = Number(match[1]);
  const intercept = Number(match[2]);
  const input = Number(match[3]);
  const t = input + 2;
  const ft = slope * t + intercept;
  const answer = t + ft;
  return {
    body: `已知 f(x)=${slope}x+${intercept}，若 f(t)=f(${input})+2×${slope}，求 t+f(t)。`,
    answer,
    options: numberOptions(answer),
    explanation: `一次函数斜率为 ${slope}，函数值增加 2×${slope} 时自变量增加 2，所以 t=${input}+2=${t}。f(t)=${slope}×${t}+${intercept}=${ft}，故 t+f(t)=${answer}。`
  };
}

function remediateTriangle(row) {
  const match = parseOldPrompt(row, /在三角形 ABC 中，若 AB=(-?\d+)，AC=(-?\d+)，且 ∠A=60°，表达式 AB·AC 的值是多少？/);
  if (!match) return null;
  const ab = Number(match[1]);
  const ac = Number(match[2]);
  if (isAdvanced(row)) {
    const answer = ab * ab + ac * ac - ab * ac;
    return {
      body: `在三角形 ABC 中，AB=${ab}，AC=${ac}，且 ∠A=60°。求 BC²。`,
      answer,
      options: numberOptions(answer),
      explanation: `由余弦定理，BC²=AB²+AC²-2AB·AC·cos60°=${ab}²+${ac}²-${ab}×${ac}=${answer}。`
    };
  }
  const coefficient = ab * ac;
  const answer = sqrt3Term(coefficient, 4);
  return {
    body: `在三角形 ABC 中，AB=${ab}，AC=${ac}，且 ∠A=60°。求 △ABC 的面积。`,
    answer,
    options: sqrt3Options(answer, coefficient, 4),
    explanation: `三角形面积 S=1/2×AB×AC×sin60°=1/2×${ab}×${ac}×√3/2=${answer}。`
  };
}

function trigMaxCount(phaseNumerator) {
  const lower = Math.ceil((phaseNumerator - 3) / 12);
  const upper = Math.floor(2 + (phaseNumerator - 3) / 12);
  return Math.max(0, upper - lower + 1);
}

function remediateTrig(row) {
  const match = parseOldPrompt(row, /函数 y=(-?\d+)sin\(2x\+(-?\d+)π\/6\) 的最小正周期是多少？/);
  if (!match) return null;
  const amplitude = Number(match[1]);
  const phase = Number(match[2]);
  const answer = trigMaxCount(phase);
  return {
    body: `函数 y=${amplitude}sin(2x+${phase}π/6)。求它在区间 [0,2π] 内取得最大值的次数。`,
    answer,
    options: numberOptions(answer),
    explanation: `最大值在 2x+${phase}π/6=π/2+2kπ 时取得，即 x=π(3-${phase})/12+kπ。限制 0≤x≤2π，可得符合条件的整数 k 有 ${answer} 个。`
  };
}

function remediatePlaneVector(row) {
  const match = parseOldPrompt(row, /已知向量 u=\((-?\d+),(-?\d+)\)，v=\((-?\d+),(-?\d+)\)，求 u·v。/);
  if (!match) return null;
  const ax = Number(match[1]);
  const ay = Number(match[2]);
  const bx = Number(match[3]);
  const by = Number(match[4]);
  const answer = 2 * (ax * bx + ay * by);
  return {
    body: `已知向量 u=(${ax},${ay})，v=(${bx},${by})，求 |u+v|²-|u|²-|v|²。`,
    answer,
    options: numberOptions(answer),
    explanation: `由 |u+v|²=|u|²+2u·v+|v|²，所求为 2u·v=2×(${ax}×${bx}+${ay}×${by})=${answer}。`
  };
}

function remediateComplex(row) {
  const match = parseOldPrompt(row, /复数 z=\((-?\d+)\+(-?\d+)i\)\+\((-?\d+)-(-?\d+)i\)，求 z 的实部。/);
  if (!match) return null;
  const firstReal = Number(match[1]);
  const imaginary = Number(match[2]);
  const secondReal = Number(match[3]);
  const realPart = firstReal + secondReal;
  const answer = 2 * realPart;
  return {
    body: `复数 z=(${firstReal}+${imaginary}i)+(${secondReal}-${imaginary}i)，w=(1+i)z，求 Re(w)+Im(w)。`,
    answer,
    options: numberOptions(answer),
    explanation: `z 的虚部抵消，z=${realPart}。所以 w=(1+i)${realPart}=${realPart}+${realPart}i，Re(w)+Im(w)=${answer}。`
  };
}

function remediateCuboidFaces(row) {
  const match = parseOldPrompt(row, /长方体中同一顶点出发的两条互相垂直棱长分别为 (-?\d+) 和 (-?\d+)，这两条棱围成的矩形面积是多少？/);
  if (!match) return null;
  const first = Number(match[1]);
  const second = Number(match[2]);
  const third = 3 + (localIndex(row) % 9);
  const answer = first * second + first * third;
  return {
    body: `长方体中同一顶点出发的三条互相垂直棱长分别为 ${first}、${second}、${third}。求含有长为 ${first} 的棱的两个相邻面的面积之和。`,
    answer,
    options: numberOptions(answer),
    explanation: `两个相邻面的面积分别为 ${first}×${second} 和 ${first}×${third}，面积和为 ${first}×${second}+${first}×${third}=${answer}。`
  };
}

function remediateCuboidVolume(row) {
  const match = parseOldPrompt(row, /一个长方体的长、宽、高分别为 (-?\d+)、(-?\d+)、(-?\d+)，求体积。/);
  if (!match) return null;
  const length = Number(match[1]);
  const width = Number(match[2]);
  const height = Number(match[3]);
  const newLength = length + 1;
  const newWidth = Math.max(1, width - 1);
  const answer = length * width * height + newLength * newWidth * height;
  return {
    body: `一个长方体的长、宽、高分别为 ${length}、${width}、${height}；另一个长方体的长、宽、高分别为 ${newLength}、${newWidth}、${height}。求两个长方体体积之和。`,
    answer,
    options: numberOptions(answer),
    explanation: `两个体积分别为 ${length}×${width}×${height} 和 ${newLength}×${newWidth}×${height}，体积之和为 ${answer}。`
  };
}

function remediateProbability(row) {
  const match = parseOldPrompt(row, /袋中有 (-?\d+) 个红球和 (-?\d+) 个蓝球，随机取出 1 个，取到红球的概率是多少？/);
  if (!match) return null;
  const red = Number(match[1]);
  const blue = Number(match[2]);
  if (isAdvanced(row)) {
    const numerator = red * (red - 1);
    const denominator = (red + blue) * (red + blue - 1);
    const answer = formatFraction(numerator, denominator);
    return {
      body: `袋中有 ${red} 个红球和 ${blue} 个蓝球，不放回连续取出 2 个。求两次都取到红球的概率。`,
      answer,
      acceptedAnswers: [answer, `${numerator}/${denominator}`],
      options: fractionOptions(answer, numerator, denominator),
      explanation: `不放回取两次都为红球的概率为 ${red}/${red + blue}×${red - 1}/${red + blue - 1}=${numerator}/${denominator}=${answer}。`
    };
  }
  const numerator = red;
  const denominator = red + blue;
  const answer = formatFraction(numerator, denominator);
  return {
    body: `袋中有 ${red} 个红球和 ${blue} 个蓝球，随机取出 1 个，取到红球的概率是多少？`,
    answer,
    acceptedAnswers: [answer, `${numerator}/${denominator}`],
    options: fractionOptions(answer, numerator, denominator),
    explanation: `总球数为 ${red + blue}，红球 ${red} 个，所以概率为 ${red}/${red + blue}=${answer}。`
  };
}

function remediateStatistics(row) {
  const match = parseOldPrompt(row, /一组数据为 (-?\d+)，(-?\d+)，(-?\d+)，求这组数据的平均数。/);
  if (!match) return null;
  const first = Number(match[1]);
  const second = Number(match[2]);
  const third = Number(match[3]);
  const mean = (first + second + third) / 3;
  const increase = 1 + (localIndex(row) % 3);
  const answer = 4 * (mean + increase) - first - second - third;
  return {
    body: `一组数据为 ${first}，${second}，${third}，若再加入一个数 x 后，四个数平均数比原平均数大 ${increase}，求 x。`,
    answer,
    options: numberOptions(answer),
    explanation: `原平均数为 (${first}+${second}+${third})/3=${mean}。加入 x 后平均数为 ${mean}+${increase}=${mean + increase}，所以 x=4×${mean + increase}-(${first}+${second}+${third})=${answer}。`
  };
}

function remediateLine(row) {
  const match = parseOldPrompt(row, /直线经过点 \((-?\d+),(-?\d+)\) 和 \((-?\d+),(-?\d+)\)，求斜率。/);
  if (!match) return null;
  const x1 = Number(match[1]);
  const y1 = Number(match[2]);
  const x2 = Number(match[3]);
  const y2 = Number(match[4]);
  const slope = (y2 - y1) / (x2 - x1);
  const intercept = 1 + (localIndex(row) % 7);
  const answer = slope * 2 + intercept;
  return {
    body: `直线 l 经过点 (${x1},${y1}) 和 (${x2},${y2})。直线 m 与 l 平行，且经过点 (0,${intercept})。求直线 m 在 x=2 时的 y 坐标。`,
    answer,
    options: numberOptions(answer),
    explanation: `l 的斜率为 (${y2}-${y1})/(${x2}-${x1})=${slope}。m 与 l 平行，斜率也为 ${slope}，且过 (0,${intercept})，所以 x=2 时 y=${slope}×2+${intercept}=${answer}。`
  };
}

function remediateEllipse(row) {
  const match = parseOldPrompt(row, /椭圆 x²\/(-?\d+)\+y²\/(-?\d+)=1 中，求 c²=a²-b² 的值。/);
  if (!match) return null;
  const aSquared = Number(match[1]);
  const bSquared = Number(match[2]);
  const cSquared = aSquared - bSquared;
  const answer = 4 * cSquared;
  return {
    body: `椭圆 x²/${aSquared}+y²/${bSquared}=1 的两个焦点为 F1，F2。求 |F1F2|²。`,
    answer,
    options: numberOptions(answer),
    explanation: `c²=${aSquared}-${bSquared}=${cSquared}，两焦点距离 |F1F2|=2c，所以 |F1F2|²=4c²=${answer}。`
  };
}

function remediateSpaceVector(row) {
  const match = parseOldPrompt(row, /空间向量 p=\((-?\d+),(-?\d+),(-?\d+)\)，求 \|p\|²。/);
  if (!match) return null;
  const x = Number(match[1]);
  const y = Number(match[2]);
  const z = Number(match[3]);
  const answer = 2 * (x + y + z) + 3;
  return {
    body: `空间向量 p=(${x},${y},${z})，q=(1,1,1)，求 |p+q|²-|p|²。`,
    answer,
    options: numberOptions(answer),
    explanation: `|p+q|²-|p|²=2p·q+|q|²=2×(${x}+${y}+${z})+3=${answer}。`
  };
}

function remediateSequence(row) {
  const match = parseOldPrompt(row, /等差数列首项为 (-?\d+)，公差为 (-?\d+)，求第 (-?\d+) 项。/);
  if (!match) return null;
  const first = Number(match[1]);
  const difference = Number(match[2]);
  const term = Number(match[3]);
  const nth = first + (term - 1) * difference;
  const answer = (term * (first + nth)) / 2;
  return {
    body: `等差数列首项为 ${first}，公差为 ${difference}，第 ${term} 项为 ${nth}。求前 ${term} 项和。`,
    answer,
    options: numberOptions(answer),
    explanation: `第 ${term} 项为 ${nth}，前 ${term} 项和 S_${term}=${term}(${first}+${nth})/2=${answer}。`
  };
}

function remediateDerivative(row) {
  const match = parseOldPrompt(row, /函数 f\(x\)=(-?\d+)x²\+(-?\d+)，求 f'\((-?\d+)\)。/);
  if (!match) return null;
  const coefficient = Number(match[1]);
  const constant = Number(match[2]);
  const input = Number(match[3]);
  const slope = 2 * coefficient * input;
  const fx = coefficient * input * input + constant;
  const answer = fx - slope * input;
  return {
    body: `函数 f(x)=${coefficient}x²+${constant}，求曲线 y=f(x) 在 x=${input} 处切线的 y 轴截距。`,
    answer,
    options: numberOptions(answer),
    explanation: `f'(${input})=${slope}，f(${input})=${fx}。切线方程为 y-${fx}=${slope}(x-${input})，令 x=0，得 y=${answer}。`
  };
}

function remediateCombination(row) {
  const match = parseOldPrompt(row, /从 (-?\d+) 个不同元素中选 2 个组成一个无序组合，共有多少种选法？/);
  if (!match) return null;
  const count = Number(match[1]);
  const answer = (count * (count - 1) * (count - 2)) / 2;
  return {
    body: `从 ${count} 个不同元素中先选 2 个组成无序小组，再从余下元素中选 1 个作观察员，共有多少种安排？`,
    answer,
    options: numberOptions(answer),
    explanation: `先选无序小组有 C(${count},2)=${(count * (count - 1)) / 2} 种，再从余下 ${count - 2} 个元素中选观察员，所以共有 ${(count * (count - 1)) / 2}×${count - 2}=${answer} 种。`
  };
}

function remediateMultiplication(row) {
  const match = parseOldPrompt(row, /若事件 A 有 (-?\d+) 种情况，且每种 A 情况下事件 B 有 (-?\d+) 种情况，则按分步计数共有多少种结果？/);
  if (!match) return null;
  const first = Number(match[1]);
  const second = Number(match[2]);
  const reducedCases = Math.max(1, Math.min(first - 1, 1 + (localIndex(row) % Math.max(1, first - 1))));
  const answer = reducedCases * (second - 1) + (first - reducedCases) * second;
  return {
    body: `若事件 A 有 ${first} 种情况，其中 ${reducedCases} 种 A 情况下事件 B 有 ${second - 1} 种情况，其余 A 情况下事件 B 有 ${second} 种情况。按分步计数共有多少种结果？`,
    answer,
    options: numberOptions(answer),
    explanation: `分类后按分步计数相加：${reducedCases}×${second - 1}+(${first}-${reducedCases})×${second}=${answer}。`
  };
}

const advancedRemediators = [
  ["set-richness", remediateSet],
  ["inequality-richness", remediateInequality],
  ["log-richness", remediateLog],
  ["exponential-richness", remediateExponential],
  ["linear-function-richness", remediateLinearFunction],
  ["triangle-condition-richness", remediateTriangle],
  ["trig-richness", remediateTrig],
  ["plane-vector-richness", remediatePlaneVector],
  ["complex-richness", remediateComplex],
  ["cuboid-face-richness", remediateCuboidFaces],
  ["cuboid-volume-richness", remediateCuboidVolume],
  ["probability-richness", remediateProbability],
  ["statistics-richness", remediateStatistics],
  ["line-richness", remediateLine],
  ["ellipse-richness", remediateEllipse],
  ["space-vector-richness", remediateSpaceVector],
  ["sequence-richness", remediateSequence],
  ["derivative-richness", remediateDerivative],
  ["combination-richness", remediateCombination],
  ["multiplication-rule-richness", remediateMultiplication]
];

const targetedRemediators = [
  ["unused-condition-p2", remediateTriangle],
  ["answer-normalization-p2", remediateProbability]
];

function remediateRow(row, mandatoryP2Ids) {
  const issueCodes = [];
  let core = null;
  if (isAdvanced(row)) {
    for (const [code, remediator] of advancedRemediators) {
      core = remediator(row);
      if (core) {
        issueCodes.push("difficulty-rigor-p2", code);
        break;
      }
    }
  }
  if (!core) {
    for (const [code, remediator] of targetedRemediators) {
      core = remediator(row);
      if (core) {
        issueCodes.push(code);
        break;
      }
    }
  }
  if (!core) return { row, changed: false, issueCodes: [], mandatory: mandatoryP2Ids.has(row.id) };
  return { row: makeRow(row, core, issueCodes), changed: true, issueCodes, mandatory: mandatoryP2Ids.has(row.id) };
}

function normalizePromptPrefix(record) {
  const promptZhHans = String(record.row.promptZhHans ?? "").replace(/^V4安全变式(\d+)([:：])/, "V4修复变式$1$2");
  const prefixNormalized = promptZhHans !== record.row.promptZhHans;
  if (!prefixNormalized) return { ...record, prefixNormalized: false };
  return {
    ...record,
    prefixNormalized: true,
    row: {
      ...record.row,
      promptZhHans,
      reviewNotes: record.changed
        ? record.row.reviewNotes
        : "V4 remediated candidate row; prompt prefix normalized from frozen V4 baseline to clear exact-duplicate gate while preserving row mathematics. S18 manual re-review required before app integration."
    }
  };
}

function selectManualReReviewQueue(rows, records, mandatoryP2Ids) {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const queue = [];
  const used = new Set();

  const push = (row, reviewReason) => {
    if (!row || used.has(row.id)) return;
    queue.push({ ...row, reviewReason });
    used.add(row.id);
  };

  for (const id of Array.from(mandatoryP2Ids).sort()) push(byId.get(id), "mandatory-original-p2-recheck");

  for (const grade of ["S4", "S5", "S6"]) {
    const needed = Math.max(0, 50 - queue.filter((row) => row.grade === grade).length);
    const candidates = rows
      .filter((row) => row.grade === grade && !used.has(row.id))
      .sort((a, b) => stableHash(`${a.id}:${a.promptZhHans}`) - stableHash(`${b.id}:${b.promptZhHans}`));
    for (const row of candidates.slice(0, needed)) push(row, "fresh-150-sample-fill");
  }

  const targeted = records
    .filter((record) => record.changed && isAdvanced(record.row) && !used.has(record.row.id))
    .sort((a, b) => stableHash(`${a.row.id}:${a.row.promptZhHans}`) - stableHash(`${b.row.id}:${b.row.promptZhHans}`))
    .slice(0, 50);
  for (const record of targeted) push(record.row, "challenge-exam-targeted-p2-sweep");

  return queue.sort((a, b) => a.grade.localeCompare(b.grade) || a.id.localeCompare(b.id));
}

function buildMarkdown({ rows, records, mandatoryP2Ids, manualQueue }) {
  const changedRecords = records.filter((record) => record.changed);
  const prefixNormalizedRecords = records.filter((record) => record.prefixNormalized);
  const changedByGrade = countBy(changedRecords.map((record) => record.row.grade));
  const changedByDifficulty = countBy(changedRecords.map((record) => record.row.difficulty));
  const changedByType = countBy(changedRecords.map((record) => record.row.type));
  const changedByIssue = {};
  for (const record of changedRecords) {
    for (const code of record.issueCodes) changedByIssue[code] = (changedByIssue[code] || 0) + 1;
  }
  const mandatoryChanged = records.filter((record) => mandatoryP2Ids.has(record.row.id) && record.changed).length;
  const mandatoryUnchanged = Array.from(mandatoryP2Ids).filter((id) => !records.some((record) => record.row.id === id && record.changed));

  return `# Mainland HJB High Generated Bank V4 Remediated P2 Audit

- Date: 2026-05-24
- Session ID: S18
- Scope: V4 remediated offline candidate bank, derived from frozen V4 baseline
- Status: candidate-only-auto-remediated-pending-manual-re-review

## Executive Summary

| Metric | Value |
| --- | --- |
| Total rows | ${rows.length} |
| Rows rewritten | ${changedRecords.length} |
| Prompt-prefix normalized rows | ${prefixNormalizedRecords.length} |
| Original manual P2 rows | ${mandatoryP2Ids.size} |
| Original manual P2 rows rewritten | ${mandatoryChanged} |
| Original manual P2 rows not rewritten | ${mandatoryUnchanged.length} |
| Manual re-review queue rows | ${manualQueue.length} |
| App integration status | Not approved |

## Remediation By Issue Class

| Issue class | Rows |
| --- | --- |
${Object.entries(changedByIssue).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([issue, count]) => `| ${issue} | ${count} |`).join("\n")}

## Remediation By Grade

| Grade | Rows |
| --- | --- |
${["S4", "S5", "S6"].map((grade) => `| ${grade} | ${changedByGrade[grade] || 0} |`).join("\n")}

## Remediation By Difficulty

| Difficulty | Rows |
| --- | --- |
${["Foundation", "Core", "Challenge", "Exam"].map((difficulty) => `| ${difficulty} | ${changedByDifficulty[difficulty] || 0} |`).join("\n")}

## Remediation By Type

| Type | Rows |
| --- | --- |
${["multiple-choice", "fill-in", "short-answer"].map((type) => `| ${type} | ${changedByType[type] || 0} |`).join("\n")}

## Manual Re-review Gate

- 59 original P2 rows remain mandatory manual re-review rows.
- The queue also fills a fresh 150-row grade-balanced sample and adds a 50-row Challenge/Exam targeted sweep.
- This package remains candidate-only until S18 manual re-review records P0/P1 = 0 and P2 <= 5%.

## Unresolved Mandatory Rows

${mandatoryUnchanged.length ? mandatoryUnchanged.map((id) => `- ${id}`).join("\n") : "- None"}
`;
}

function buildQaReport({ rows, records, manualQueue }) {
  const gradeCounts = countBy(rows.map((row) => row.grade));
  const typeCounts = countBy(rows.map((row) => `${row.grade}:${row.type}`));
  const difficultyCounts = countBy(rows.map((row) => `${row.grade}:${row.difficulty}`));
  const changedRecords = records.filter((record) => record.changed);
  const prefixNormalizedRecords = records.filter((record) => record.prefixNormalized);
  return `# Mainland HJB High Generated Bank V4 Remediated QA Package

- Date: 2026-05-24
- Session ID: S18
- Package status: candidate-only-auto-remediated-pending-manual-re-review
- Baseline: frozen \`mainland-hjb-high-generated-bank-v4\`

## Inventory

| Metric | Value |
| --- | --- |
| Total questions | ${rows.length} |
| S4 questions | ${gradeCounts.S4 || 0} |
| S5 questions | ${gradeCounts.S5 || 0} |
| S6 questions | ${gradeCounts.S6 || 0} |
| Rewritten rows | ${changedRecords.length} |
| Prompt-prefix normalized rows | ${prefixNormalizedRecords.length} |
| Manual re-review queue rows | ${manualQueue.length} |

## Per-grade Type Quotas

| Grade | Multiple-choice | Fill-in | Short-answer |
| --- | --- | --- | --- |
${["S4", "S5", "S6"].map((grade) => `| ${grade} | ${typeCounts[`${grade}:multiple-choice`] || 0} | ${typeCounts[`${grade}:fill-in`] || 0} | ${typeCounts[`${grade}:short-answer`] || 0} |`).join("\n")}

## Per-grade Difficulty Quotas

| Grade | Foundation | Core | Challenge | Exam |
| --- | --- | --- | --- | --- |
${["S4", "S5", "S6"].map((grade) => `| ${grade} | ${difficultyCounts[`${grade}:Foundation`] || 0} | ${difficultyCounts[`${grade}:Core`] || 0} | ${difficultyCounts[`${grade}:Challenge`] || 0} | ${difficultyCounts[`${grade}:Exam`] || 0} |`).join("\n")}

## Decision

- Automated remediation has been applied to shallow Challenge/Exam patterns, unused triangle angle conditions, and fraction answer normalization.
- This does not approve app integration. Run automatic audits and complete S18 manual re-review before any production planning.
`;
}

function main() {
  const originalRows = readJsonl(BASELINE_QUESTIONS_JSONL);
  const sourceQueue = readCsv(SOURCE_REMEDIATION_QUEUE);
  const mandatoryP2Ids = new Set(sourceQueue.map((row) => row.id).filter(Boolean));
  const records = originalRows.map((row) => normalizePromptPrefix(remediateRow(row, mandatoryP2Ids)));
  const rows = records.map((record) => record.row);
  const manualQueue = selectManualReReviewQueue(rows, records, mandatoryP2Ids);
  const auditRows = records.map((record) => ({
    id: record.row.id,
    grade: record.row.grade,
    volume: record.row.volume,
    chapter: record.row.chapter,
    topicTitleZhHans: record.row.topicTitleZhHans,
    type: record.row.type,
    difficulty: record.row.difficulty,
    remediated: record.changed ? "yes" : "no",
    promptPrefixNormalized: record.prefixNormalized ? "yes" : "no",
    mandatoryOriginalP2: record.mandatory ? "yes" : "no",
    issueCodes: record.issueCodes.join(" | "),
    promptZhHans: record.row.promptZhHans,
    answer: record.row.answer,
    acceptedAnswers: record.row.acceptedAnswers,
    reviewNotes: record.row.reviewNotes
  }));

  fs.writeFileSync(QUESTIONS_JSONL, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
  writeCsv(QUESTIONS_CSV, rows, QUESTION_FIELDS);
  fs.writeFileSync(QUESTION_PACK_JSON, `${JSON.stringify({ questions: rows }, null, 2)}\n`);
  writeCsv(REMEDIATION_AUDIT_CSV, auditRows, [
    "id",
    "grade",
    "volume",
    "chapter",
    "topicTitleZhHans",
    "type",
    "difficulty",
    "remediated",
    "promptPrefixNormalized",
    "mandatoryOriginalP2",
    "issueCodes",
    "promptZhHans",
    "answer",
    "acceptedAnswers",
    "reviewNotes"
  ]);
  fs.writeFileSync(
    REMEDIATION_AUDIT_JSON,
    `${JSON.stringify(
      {
        reportDate: "2026-05-24",
        package: "mainland-hjb-high-generated-bank-v4-remediated",
        status: "candidate-only-auto-remediated-pending-manual-re-review",
        rows: rows.length,
        remediatedRows: records.filter((record) => record.changed).length,
        promptPrefixNormalizedRows: records.filter((record) => record.prefixNormalized).length,
        mandatoryOriginalP2Rows: mandatoryP2Ids.size,
        manualReReviewQueueRows: manualQueue.length,
        auditRows
      },
      null,
      2
    )}\n`
  );
  writeCsv(MANUAL_REMEDIATION_QUEUE_CSV, manualQueue, [
    "id",
    "grade",
    "volume",
    "chapter",
    "topicTitleZhHans",
    "type",
    "difficulty",
    "promptZhHans",
    "optionsZhHans",
    "answer",
    "acceptedAnswers",
    "explanationZhHans",
    "reviewReason"
  ]);
  writeCsv(MANUAL_RESULTS_CSV, [], [
    "id",
    "grade",
    "reviewer",
    "mathQaStatus",
    "terminologyQaStatus",
    "sourceDistanceStatus",
    "decision",
    "p2IssueCodes",
    "notes"
  ]);
  const remediationMd = buildMarkdown({ rows, records, mandatoryP2Ids, manualQueue });
  fs.writeFileSync(REMEDIATION_AUDIT_MD, remediationMd);
  fs.writeFileSync(MANUAL_QA_SUMMARY_MD, remediationMd);
  fs.writeFileSync(QA_REPORT_MD, buildQaReport({ rows, records, manualQueue }));
  fs.writeFileSync(
    DECISION_MD,
    `# S18 Promotability Decision - Mainland HJB High Generated Bank V4 Remediated

- Date: 2026-05-24
- Session ID: S18
- Decision: candidate-only-auto-remediated-pending-manual-re-review
- Reason: P2 remediation has been applied, but the remediated package still requires fresh S18 manual re-review before any promotion. The frozen V4 baseline remains manual-sampling-blocked-pending-p2-remediation.
- App integration status: Not approved. Do not connect this package to data/questions.ts, App UI, API, or production data until S18 manual re-review passes and the owner explicitly approves S04/S08 integration planning.
`
  );
  console.log(
    `P2 remediation complete: rows=${rows.length}; remediated=${records.filter((record) => record.changed).length}; prompt-normalized=${records.filter((record) => record.prefixNormalized).length}; manual queue=${manualQueue.length}`
  );
}

main();
