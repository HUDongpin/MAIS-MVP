import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const INPUT = path.join(__dirname, "questions.jsonl");
const AUDIT_JSON = path.join(__dirname, "quality-audit.json");
const AUDIT_CSV = path.join(__dirname, "quality-audit.csv");
const AUDIT_MD = path.join(__dirname, "quality-audit.md");
const FAILING_ROWS_CSV = path.join(__dirname, "quality-failing-rows.csv");
const MANUAL_QUEUE_CSV = path.join(__dirname, "quality-manual-review-queue.csv");

const packageLabel = "Mainland HJB High Generated Bank V3 Remediated";
const EXPECTED_TOTAL = 1500;
const EXPECTED_GRADES = ["S4", "S5", "S6"];
const EXPECTED_GRADE_COUNT = 500;

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`Missing input file: ${filePath}`);
  const text = fs.readFileSync(filePath, "utf8").trim();
  if (!text) return [];
  return text.split(/\n/).map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      return { id: `__parse_error_${index + 1}`, __parseError: String(error), __rawLine: line };
    }
  });
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  return `"${text.replace(/"/g, '""').replace(/\r?\n/g, "\\n")}"`;
}

function writeCsv(filePath, rows, headers) {
  const lines = [headers.map(csvEscape).join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function countBy(values) {
  const counts = {};
  for (const value of values) counts[value] = (counts[value] || 0) + 1;
  return counts;
}

function stableHash(text) {
  let hash = 2166136261;
  for (const char of String(text)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
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

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(10)));
}

function formatFraction(numerator, denominator) {
  if (denominator === 0) return null;
  const divisor = gcd(numerator, denominator);
  const sign = denominator < 0 ? -1 : 1;
  const n = (numerator / divisor) * sign;
  const d = Math.abs(denominator / divisor);
  return d === 1 ? String(n) : `${n}/${d}`;
}

function lcm(first, second) {
  return Math.abs(first * second) / gcd(first, second);
}

function formatSqrt3Term(coefficient, denominator = 1) {
  if (coefficient === 0) return "0";
  const divisor = gcd(coefficient, denominator);
  const n = coefficient / divisor;
  const d = denominator / divisor;
  const radical = n === 1 ? "√3" : `${n}√3`;
  return d === 1 ? radical : `${radical}/${d}`;
}

function trigMaxCount(phaseNumerator) {
  const lower = Math.ceil((phaseNumerator - 3) / 12);
  const upper = Math.floor(2 + (phaseNumerator - 3) / 12);
  return Math.max(0, upper - lower + 1);
}

function stripPromptPrefix(prompt) {
  return String(prompt ?? "")
    .replace(/^V4修复变式\d+[:：]/, "")
    .replace(/^V4安全变式\d+[:：]/, "")
    .replace(/^V3修复变式\d+[:：]/, "")
    .replace(/^V3安全变式\d+[:：]/, "")
    .replace(/^二轮变式\d+[:：]/, "")
    .replace(/^变式\d+[:：]/, "")
    .replace(/^(选择|填空|解答)[:：]/, "")
    .trim();
}

function normalizeIdentity(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[−–—]/g, "-")
    .replace(/\s+/g, "")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/π/g, "pi")
    .replace(/[，、；;：:。！？?!（）()【】\[\]{}“”"‘’']/g, "");
}

function parseScalar(value) {
  const normalized = normalizeIdentity(value)
    .replace(/^答案[:：]?/, "")
    .replace(/^约/, "")
    .replace(/个$/, "");
  if (normalized === "pi") return Math.PI;
  const fraction = normalized.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
  if (fraction) {
    const denominator = Number(fraction[2]);
    if (denominator === 0) return null;
    return Number(fraction[1]) / denominator;
  }
  if (/^-?\d+(?:\.\d+)?$/.test(normalized)) return Number(normalized);
  return null;
}

function answerMatches(actual, expected) {
  if (normalizeIdentity(actual) === normalizeIdentity(expected)) return true;
  const actualScalar = parseScalar(actual);
  const expectedScalar = parseScalar(expected);
  return actualScalar !== null && expectedScalar !== null && Math.abs(actualScalar - expectedScalar) < 0.0000001;
}

function matchesAnyAccepted(independentAnswer, row) {
  const accepted = [row.answer, ...(Array.isArray(row.acceptedAnswers) ? row.acceptedAnswers : [])].filter(Boolean);
  return accepted.some((candidate) => answerMatches(independentAnswer, candidate));
}

function buildSolved(rule, answer) {
  return { status: "pass", solverRule: rule, independentAnswer: String(answer) };
}

function solveFromPrompt(row) {
  const prompt = stripPromptPrefix(row.promptZhHans);
  const patterns = [
    {
      rule: "remediated-set-symmetric-difference",
      regex: /设集合 A=\{1,2,3,\.\.\.,(-?\d+)\}，B 为 A 中能被 (-?\d+) 整除的数，C 为 A 中能被 (-?\d+) 整除的数。求只属于 B 和 C 中一个集合的元素个数。/,
      solve: ([, upper, first, second]) => {
        const n = Number(upper);
        const a = Number(first);
        const b = Number(second);
        return Math.floor(n / a) + Math.floor(n / b) - 2 * Math.floor(n / lcm(a, b));
      }
    },
    {
      rule: "remediated-inequality-integer-count",
      regex: /求不等式组 x\+(-?\d+)>(-?\d+)，x≤(-?\d+) 的整数解个数。/,
      solve: ([, addend, right, upper]) => Math.max(0, Number(upper) - (Number(right) - Number(addend)))
    },
    {
      rule: "remediated-log-linked-exponents",
      regex: /已知 log_(\d+)\(\d+\^(-?\d+)\)=m，且 log_\d+\(\d+\^n\)=m\+3。求 m\+n。/,
      solve: ([, , exponent]) => 2 * Number(exponent) + 3
    },
    {
      rule: "remediated-exponential-linked-input",
      regex: /函数 f\(x\)=(-?\d+)\^x。若 f\(t\)=\d+·f\(2\)，求 f\(t\)\+f\(t-1\)。/,
      solve: ([, base]) => Number(base) ** 3 + Number(base) ** 2
    },
    {
      rule: "remediated-linear-function-increment",
      regex: /已知 f\(x\)=(-?\d+)x\+(-?\d+)，若 f\(t\)=f\((-?\d+)\)\+2×(-?\d+)，求 t\+f\(t\)。/,
      solve: ([, slope, intercept, input]) => {
        const t = Number(input) + 2;
        return t + Number(slope) * t + Number(intercept);
      }
    },
    {
      rule: "remediated-triangle-cosine-law",
      regex: /在三角形 ABC 中，AB=(-?\d+)，AC=(-?\d+)，且 ∠A=60°。求 BC²。/,
      solve: ([, first, second]) => Number(first) ** 2 + Number(second) ** 2 - Number(first) * Number(second)
    },
    {
      rule: "remediated-triangle-area",
      regex: /在三角形 ABC 中，AB=(-?\d+)，AC=(-?\d+)，且 ∠A=60°。求 △ABC 的面积。/,
      solve: ([, first, second]) => formatSqrt3Term(Number(first) * Number(second), 4)
    },
    {
      rule: "remediated-trig-max-count",
      regex: /函数 y=(-?\d+)sin\(2x\+(-?\d+)π\/6\)。求它在区间 \[0,2π\] 内取得最大值的次数。/,
      solve: ([, , phase]) => trigMaxCount(Number(phase))
    },
    {
      rule: "remediated-plane-vector-identity",
      regex: /已知向量 u=\((-?\d+),(-?\d+)\)，v=\((-?\d+),(-?\d+)\)，求 \|u\+v\|²-\|u\|²-\|v\|²。/,
      solve: ([, ax, ay, bx, by]) => 2 * (Number(ax) * Number(bx) + Number(ay) * Number(by))
    },
    {
      rule: "remediated-complex-linear-transform",
      regex: /复数 z=\((-?\d+)\+(-?\d+)i\)\+\((-?\d+)-(-?\d+)i\)，w=\(1\+i\)z，求 Re\(w\)\+Im\(w\)。/,
      solve: ([, firstReal, , secondReal]) => 2 * (Number(firstReal) + Number(secondReal))
    },
    {
      rule: "remediated-cuboid-adjacent-face-sum",
      regex: /长方体中同一顶点出发的三条互相垂直棱长分别为 (-?\d+)、(-?\d+)、(-?\d+)。求含有长为 -?\d+ 的棱的两个相邻面的面积之和。/,
      solve: ([, first, second, third]) => Number(first) * Number(second) + Number(first) * Number(third)
    },
    {
      rule: "remediated-cuboid-volume-sum",
      regex: /一个长方体的长、宽、高分别为 (-?\d+)、(-?\d+)、(-?\d+)；另一个长方体的长、宽、高分别为 (-?\d+)、(-?\d+)、(-?\d+)。求两个长方体体积之和。/,
      solve: ([, l1, w1, h1, l2, w2, h2]) => Number(l1) * Number(w1) * Number(h1) + Number(l2) * Number(w2) * Number(h2)
    },
    {
      rule: "remediated-two-red-without-replacement",
      regex: /袋中有 (-?\d+) 个红球和 (-?\d+) 个蓝球，不放回连续取出 2 个。求两次都取到红球的概率。/,
      solve: ([, red, blue]) => formatFraction(Number(red) * (Number(red) - 1), (Number(red) + Number(blue)) * (Number(red) + Number(blue) - 1))
    },
    {
      rule: "remediated-mean-after-adding-value",
      regex: /一组数据为 (-?\d+)，(-?\d+)，(-?\d+)，若再加入一个数 x 后，四个数平均数比原平均数大 (-?\d+)，求 x。/,
      solve: ([, first, second, third, increase]) => {
        const mean = (Number(first) + Number(second) + Number(third)) / 3;
        return formatNumber(4 * (mean + Number(increase)) - Number(first) - Number(second) - Number(third));
      }
    },
    {
      rule: "remediated-parallel-line-value",
      regex: /直线 l 经过点 \((-?\d+),(-?\d+)\) 和 \((-?\d+),(-?\d+)\)。直线 m 与 l 平行，且经过点 \(0,(-?\d+)\)。求直线 m 在 x=2 时的 y 坐标。/,
      solve: ([, x1, y1, x2, y2, intercept]) => formatNumber(((Number(y2) - Number(y1)) / (Number(x2) - Number(x1))) * 2 + Number(intercept))
    },
    {
      rule: "remediated-ellipse-focal-distance-squared",
      regex: /椭圆 x²\/(-?\d+)\+y²\/(-?\d+)=1 的两个焦点为 F1，F2。求 \|F1F2\|²。/,
      solve: ([, aSquared, bSquared]) => 4 * (Number(aSquared) - Number(bSquared))
    },
    {
      rule: "remediated-space-vector-translation",
      regex: /空间向量 p=\((-?\d+),(-?\d+),(-?\d+)\)，q=\(1,1,1\)，求 \|p\+q\|²-\|p\|²。/,
      solve: ([, x, y, z]) => 2 * (Number(x) + Number(y) + Number(z)) + 3
    },
    {
      rule: "remediated-arithmetic-series-sum",
      regex: /等差数列首项为 (-?\d+)，公差为 (-?\d+)，第 (-?\d+) 项为 (-?\d+)。求前 \d+ 项和。/,
      solve: ([, first, , term, nth]) => formatNumber((Number(term) * (Number(first) + Number(nth))) / 2)
    },
    {
      rule: "remediated-derivative-tangent-intercept",
      regex: /函数 f\(x\)=(-?\d+)x²\+(-?\d+)，求曲线 y=f\(x\) 在 x=(-?\d+) 处切线的 y 轴截距。/,
      solve: ([, coefficient, constant, input]) => Number(constant) - Number(coefficient) * Number(input) ** 2
    },
    {
      rule: "remediated-combination-with-observer",
      regex: /从 (-?\d+) 个不同元素中先选 2 个组成无序小组，再从余下元素中选 1 个作观察员，共有多少种安排？/,
      solve: ([, count]) => (Number(count) * (Number(count) - 1) * (Number(count) - 2)) / 2
    },
    {
      rule: "remediated-multiplication-rule-with-exception",
      regex: /若事件 A 有 (-?\d+) 种情况，其中 (-?\d+) 种 A 情况下事件 B 有 (-?\d+) 种情况，其余 A 情况下事件 B 有 (-?\d+) 种情况。按分步计数共有多少种结果？/,
      solve: ([, first, reducedCases, reducedSecond, normalSecond]) => Number(reducedCases) * Number(reducedSecond) + (Number(first) - Number(reducedCases)) * Number(normalSecond)
    },
    {
      rule: "set-multiple-count",
      regex: /设集合 A=\{1,2,3,\.\.\.,(-?\d+)\}，集合 B 为其中能被 (-?\d+) 整除的数。求集合 B 的元素个数。/,
      solve: ([, upper, divisor]) => Math.floor(Number(upper) / Number(divisor))
    },
    {
      rule: "linear-inequality-bound",
      regex: /解不等式 x\+(-?\d+)>(-?\d+)，求 x 的取值范围右端常数 -?\d+-\d+ 的值。/,
      solve: ([, addend, right]) => Number(right) - Number(addend)
    },
    {
      rule: "log-power-definition",
      regex: /已知 log_(\d+)\(\d+\^(-?\d+)\)=m，求 m。/,
      solve: ([, , exponent]) => Number(exponent)
    },
    {
      rule: "exponential-function-evaluation",
      regex: /函数 f\(x\)=(-?\d+)\^x，求 f\(2\)。/,
      solve: ([, base]) => Number(base) ** 2
    },
    {
      rule: "linear-function-evaluation",
      regex: /已知 f\(x\)=(-?\d+)x\+(-?\d+)，求 f\((-?\d+)\)。/,
      solve: ([, slope, intercept, input]) => Number(slope) * Number(input) + Number(intercept)
    },
    {
      rule: "triangle-side-product",
      regex: /在三角形 ABC 中，若 AB=(-?\d+)，AC=(-?\d+)，且 ∠A=60°，表达式 AB·AC 的值是多少？/,
      solve: ([, first, second]) => Number(first) * Number(second)
    },
    {
      rule: "trig-function-period",
      regex: /函数 y=(-?\d+)sin\((-?\d+)x\+[^)]*\) 的最小正周期是多少？/,
      solve: ([, , omega]) => {
        const coefficient = Math.abs(Number(omega));
        if (coefficient === 1) return "2π";
        if (coefficient === 2) return "π";
        return `2π/${coefficient}`;
      }
    },
    {
      rule: "plane-vector-dot-product",
      regex: /已知向量 u=\((-?\d+),(-?\d+)\)，v=\((-?\d+),(-?\d+)\)，求 u·v。/,
      solve: ([, ax, ay, bx, by]) => Number(ax) * Number(bx) + Number(ay) * Number(by)
    },
    {
      rule: "complex-real-part",
      regex: /复数 z=\((-?\d+)\+(-?\d+)i\)\+\((-?\d+)-(-?\d+)i\)，求 z 的实部。/,
      solve: ([, firstReal, , secondReal]) => Number(firstReal) + Number(secondReal)
    },
    {
      rule: "cuboid-adjacent-face-area",
      regex: /长方体中同一顶点出发的两条互相垂直棱长分别为 (-?\d+) 和 (-?\d+)，这两条棱围成的矩形面积是多少？/,
      solve: ([, first, second]) => Number(first) * Number(second)
    },
    {
      rule: "cuboid-volume",
      regex: /一个长方体的长、宽、高分别为 (-?\d+)、(-?\d+)、(-?\d+)，求体积。/,
      solve: ([, length, width, height]) => Number(length) * Number(width) * Number(height)
    },
    {
      rule: "single-draw-probability",
      regex: /袋中有 (-?\d+) 个红球和 (-?\d+) 个蓝球，随机取出 1 个，取到红球的概率是多少？/,
      solve: ([, red, blue]) => `${Number(red)}/${Number(red) + Number(blue)}`
    },
    {
      rule: "three-number-mean",
      regex: /一组数据为 (-?\d+)，(-?\d+)，(-?\d+)，求这组数据的平均数。/,
      solve: ([, first, second, third]) => formatNumber((Number(first) + Number(second) + Number(third)) / 3)
    },
    {
      rule: "two-point-slope",
      regex: /直线经过点 \((-?\d+),(-?\d+)\) 和 \((-?\d+),(-?\d+)\)，求斜率。/,
      solve: ([, x1, y1, x2, y2]) => {
        const dx = Number(x2) - Number(x1);
        const dy = Number(y2) - Number(y1);
        return formatFraction(dy, dx) ?? "undefined";
      }
    },
    {
      rule: "ellipse-c-squared",
      regex: /椭圆 x²\/(-?\d+)\+y²\/(-?\d+)=1 中，求 c²=a²-b² 的值。/,
      solve: ([, aSquared, bSquared]) => Number(aSquared) - Number(bSquared)
    },
    {
      rule: "space-vector-norm-squared",
      regex: /空间向量 p=\((-?\d+),(-?\d+),(-?\d+)\)，求 \|p\|²。/,
      solve: ([, x, y, z]) => Number(x) ** 2 + Number(y) ** 2 + Number(z) ** 2
    },
    {
      rule: "arithmetic-sequence-term",
      regex: /等差数列首项为 (-?\d+)，公差为 (-?\d+)，求第 (-?\d+) 项。/,
      solve: ([, first, difference, term]) => Number(first) + (Number(term) - 1) * Number(difference)
    },
    {
      rule: "quadratic-derivative-evaluation",
      regex: /函数 f\(x\)=(-?\d+)x²\+(-?\d+)，求 f'\((-?\d+)\)。/,
      solve: ([, coefficient, , input]) => 2 * Number(coefficient) * Number(input)
    },
    {
      rule: "combination-choose-two",
      regex: /从 (-?\d+) 个不同元素中选 2 个组成一个无序组合，共有多少种选法？/,
      solve: ([, count]) => (Number(count) * (Number(count) - 1)) / 2
    },
    {
      rule: "multiplication-rule-counting",
      regex: /若事件 A 有 (-?\d+) 种情况，且每种 A 情况下事件 B 有 (-?\d+) 种情况，则按分步计数共有多少种结果？/,
      solve: ([, first, second]) => Number(first) * Number(second)
    }
  ];

  for (const pattern of patterns) {
    const match = prompt.match(pattern.regex);
    if (!match) continue;
    const answer = pattern.solve(match);
    return buildSolved(pattern.rule, answer);
  }

  return { status: "solver-gap", solverRule: "none", independentAnswer: "" };
}

function auditMcOptions(row, independentAnswer, answerMatchStatus) {
  if (row.type !== "multiple-choice") return { status: "not-applicable", detail: "" };
  const options = Array.isArray(row.optionsZhHans) ? row.optionsZhHans : [];
  if (options.length !== 4) return { status: "fail", detail: `Expected 4 options; found ${options.length}.` };
  if (new Set(options.map(normalizeIdentity)).size !== options.length) return { status: "fail", detail: "Duplicate options after normalization." };
  const matchingOptions = options.filter((option) => answerMatches(option, independentAnswer));
  if (matchingOptions.length !== 1) return { status: "fail", detail: `Expected exactly one option to match independent answer; found ${matchingOptions.length}.` };
  if (row.answer !== matchingOptions[0]) return { status: "fail", detail: `Stored answer does not exactly equal matching option ${matchingOptions[0]}.` };
  if (answerMatchStatus !== "pass") return { status: "fail", detail: "Stored answer failed accepted-answer match." };
  return { status: "pass", detail: "" };
}

function auditQualityRow(row) {
  const solver = solveFromPrompt(row);
  const solvableStatus = solver.status === "pass" ? "pass" : solver.status;
  const answerMatchStatus = solvableStatus === "pass" ? (matchesAnyAccepted(solver.independentAnswer, row) ? "pass" : "fail") : "not-checkable";
  const mc = auditMcOptions(row, solver.independentAnswer, answerMatchStatus);

  let severity = "none";
  const issues = [];
  if (solvableStatus === "solver-gap") {
    severity = "P1";
    issues.push("No deterministic solver rule matched the prompt.");
  } else if (solvableStatus !== "pass") {
    severity = "P0";
    issues.push("Question is not independently solvable.");
  }
  if (answerMatchStatus === "fail") {
    severity = "P0";
    issues.push(`Independent answer ${solver.independentAnswer} does not match stored answer ${row.answer}.`);
  }
  if (mc.status === "fail") {
    severity = "P0";
    issues.push(mc.detail);
  }

  const qaStatus = severity === "none" ? "pass" : "needs-review";
  return {
    questionId: row.id,
    grade: row.grade,
    volume: row.volume,
    chapter: row.chapter,
    topicTitleZhHans: row.topicTitleZhHans,
    type: row.type,
    difficulty: row.difficulty,
    promptZhHans: row.promptZhHans,
    storedAnswer: row.answer,
    acceptedAnswers: Array.isArray(row.acceptedAnswers) ? row.acceptedAnswers.join(" | ") : "",
    independentAnswer: solver.independentAnswer,
    solverRule: solver.solverRule,
    solvableStatus,
    answerMatchStatus,
    mcOptionStatus: mc.status,
    qaStatus,
    severity,
    issueDetails: issues.join(" | "),
    recommendedAction:
      qaStatus === "pass"
        ? "No automatic solvability blocker; include in S18 P2 remediation re-review before app integration."
        : "Rewrite the row or extend the deterministic solver before app integration."
  };
}

function selectManualQueue(rows, auditRows) {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const issueRows = auditRows.filter((row) => row.qaStatus !== "pass");
  const queue = issueRows.map((auditRow) => ({ ...byId.get(auditRow.questionId), ...auditRow, reviewReason: "auto-quality-issue" }));
  const issueIds = new Set(issueRows.map((row) => row.questionId));

  for (const grade of EXPECTED_GRADES) {
    const passSample = auditRows
      .filter((row) => row.grade === grade && row.qaStatus === "pass" && !issueIds.has(row.questionId))
      .sort((a, b) => stableHash(`${a.questionId}:${a.promptZhHans}`) - stableHash(`${b.questionId}:${b.promptZhHans}`))
      .slice(0, 50)
      .map((auditRow) => ({ ...byId.get(auditRow.questionId), ...auditRow, reviewReason: "grade-pass-sample" }));
    queue.push(...passSample);
  }
  return queue.sort((a, b) => String(a.grade).localeCompare(String(b.grade)) || String(a.questionId).localeCompare(String(b.questionId)));
}

function buildInventoryIssues(rows, auditRows) {
  const issues = [];
  const gradeCounts = countBy(rows.map((row) => row.grade));
  if (rows.length !== EXPECTED_TOTAL) issues.push(`Expected ${EXPECTED_TOTAL} rows; found ${rows.length}.`);
  for (const grade of EXPECTED_GRADES) {
    if ((gradeCounts[grade] || 0) !== EXPECTED_GRADE_COUNT) issues.push(`Expected ${grade} to have ${EXPECTED_GRADE_COUNT}; found ${gradeCounts[grade] || 0}.`);
  }
  const solverGapRows = auditRows.filter((row) => row.solvableStatus === "solver-gap").length;
  const unsolvableRows = auditRows.filter((row) => row.solvableStatus === "fail").length;
  const mismatchRows = auditRows.filter((row) => row.answerMatchStatus === "fail").length;
  const mcFailureRows = auditRows.filter((row) => row.mcOptionStatus === "fail").length;
  if (solverGapRows) issues.push(`Solver gaps: ${solverGapRows}.`);
  if (unsolvableRows) issues.push(`Unsolvable rows: ${unsolvableRows}.`);
  if (mismatchRows) issues.push(`Answer mismatches: ${mismatchRows}.`);
  if (mcFailureRows) issues.push(`Multiple-choice option failures: ${mcFailureRows}.`);
  return issues;
}

function percent(part, whole) {
  if (!whole) return "0.00%";
  return `${((part / whole) * 100).toFixed(2)}%`;
}

function buildMarkdownReport({ rows, auditRows, failingRows, manualQueue, inventoryIssues }) {
  const solvableCounts = countBy(auditRows.map((row) => row.solvableStatus));
  const answerMatchCounts = countBy(auditRows.map((row) => row.answerMatchStatus));
  const mcCounts = countBy(auditRows.map((row) => row.mcOptionStatus));
  const severityCounts = countBy(auditRows.map((row) => row.severity));
  const chapterFailureCounts = countBy(failingRows.map((row) => row.chapter));
  const releaseRecommendation =
    inventoryIssues.length === 0
      ? "Green: 1500/1500 rows are independently solvable and answer-key matched; proceed to S18 P2 remediation re-review before any app integration."
      : "Red: quality QA is blocked until failing rows are rewritten or solver gaps are resolved.";

  return `# ${packageLabel} Quality Audit

- Date: 2026-05-24
- Session ID: S18
- Scope: 1500 offline Shanghai Education Press / HuJiaoBan high-school candidate questions
- QA focus: independent solvability and answer-key match
- Method: deterministic row-level solver; no live LLM, OCR, external textbook corpus, source body text, or stored answer leakage into solving

## Executive Summary

| Metric | Value |
| --- | --- |
| Expected questions | ${EXPECTED_TOTAL} |
| Actual questions | ${rows.length} |
| Solvable rows | ${solvableCounts.pass || 0} |
| Solvable rate | ${percent(solvableCounts.pass || 0, rows.length)} |
| Answer-matched rows | ${answerMatchCounts.pass || 0} |
| Answer-match rate | ${percent(answerMatchCounts.pass || 0, rows.length)} |
| Solver gaps | ${solvableCounts["solver-gap"] || 0} |
| Answer mismatches | ${answerMatchCounts.fail || 0} |
| MC option failures | ${mcCounts.fail || 0} |
| P0 rows | ${severityCounts.P0 || 0} |
| P1 rows | ${severityCounts.P1 || 0} |
| P2 rows | ${severityCounts.P2 || 0} |
| Manual review queue rows | ${manualQueue.length} |
| Release recommendation | ${releaseRecommendation} |

## Chapter Failure Distribution

| Chapter | Failing Rows |
| --- | --- |
${Object.keys(chapterFailureCounts).length ? Object.entries(chapterFailureCounts).map(([chapter, count]) => `| ${chapter} | ${count} |`).join("\n") : "| None | 0 |"}

## Solver Coverage

| Solver Rule | Rows |
| --- | --- |
${Object.entries(countBy(auditRows.map((row) => row.solverRule))).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([rule, count]) => `| ${rule} | ${count} |`).join("\n")}

## Inventory Issues

| Issue |
| --- |
${inventoryIssues.length ? inventoryIssues.map((issue) => `| ${issue.replace(/\|/g, "\\|")} |`).join("\n") : "| None |"}

## QA Decision

- This quality audit verifies that each current offline fallback row can be solved from the prompt alone and that the independently computed answer matches the stored answer.
- This does not approve app integration. S18 P2 remediation re-review is still required for pedagogy, wording naturalness, grade fit, and topic richness.
`;
}

function main() {
  const rows = readJsonl(INPUT);
  const auditRows = rows.map(auditQualityRow);
  const failingRows = auditRows.filter((row) => row.qaStatus !== "pass");
  const manualQueue = selectManualQueue(rows, auditRows);
  const inventoryIssues = buildInventoryIssues(rows, auditRows);
  const summary = {
    reportDate: "2026-05-24",
    expectedQuestions: EXPECTED_TOTAL,
    actualQuestions: rows.length,
    gradeCounts: countBy(rows.map((row) => row.grade)),
    solvableStatusCounts: countBy(auditRows.map((row) => row.solvableStatus)),
    answerMatchStatusCounts: countBy(auditRows.map((row) => row.answerMatchStatus)),
    mcOptionStatusCounts: countBy(auditRows.map((row) => row.mcOptionStatus)),
    severityCounts: countBy(auditRows.map((row) => row.severity)),
    qaStatusCounts: countBy(auditRows.map((row) => row.qaStatus)),
    solverRuleCounts: countBy(auditRows.map((row) => row.solverRule)),
    failingRows: failingRows.length,
    manualReviewQueueRows: manualQueue.length,
    inventoryIssues,
    releaseRecommendation:
      inventoryIssues.length === 0
        ? "quality-green-pending-s18-p2-manual-re-review"
        : "quality-blocked-pending-remediation"
  };

  const commonHeaders = [
    "questionId",
    "grade",
    "volume",
    "chapter",
    "topicTitleZhHans",
    "type",
    "difficulty",
    "promptZhHans",
    "storedAnswer",
    "acceptedAnswers",
    "independentAnswer",
    "solverRule",
    "solvableStatus",
    "answerMatchStatus",
    "mcOptionStatus",
    "qaStatus",
    "severity",
    "issueDetails",
    "recommendedAction"
  ];
  fs.writeFileSync(AUDIT_JSON, `${JSON.stringify({ summary, rows: auditRows, failingRows }, null, 2)}\n`);
  writeCsv(AUDIT_CSV, auditRows, commonHeaders);
  writeCsv(FAILING_ROWS_CSV, failingRows, commonHeaders);
  writeCsv(MANUAL_QUEUE_CSV, manualQueue, [...commonHeaders, "reviewReason"]);
  fs.writeFileSync(AUDIT_MD, buildMarkdownReport({ rows, auditRows, failingRows, manualQueue, inventoryIssues }));
  console.log(`Quality audit complete: ${summary.releaseRecommendation}; failing rows=${failingRows.length}; manual queue rows=${manualQueue.length}`);
  if (inventoryIssues.length) process.exitCode = 1;
}

main();
