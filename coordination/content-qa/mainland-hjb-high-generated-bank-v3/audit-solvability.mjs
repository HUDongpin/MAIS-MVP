import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const INPUT = path.join(__dirname, "questions.jsonl");
const AUDIT_JSON = path.join(__dirname, "solvability-audit.json");
const AUDIT_CSV = path.join(__dirname, "solvability-audit.csv");
const AUDIT_MD = path.join(__dirname, "solvability-audit.md");
const MANUAL_QUEUE_CSV = path.join(__dirname, "manual-review-queue.csv");
const RELEASE_DECISION_MD = path.join(__dirname, "s18-promotability-decision.md");

const packageLabel = "Mainland HJB High Generated Bank V3";
const priorBankDirs = [
  "../mainland-hjb-high-generated-bank-v1",
  "../mainland-hjb-high-generated-bank-v2",
  "../mainland-hjb-high-generated-bank-v4",
  "../mainland-hjb-high-generated-bank-v4-remediated"
];
const EXPECTED_TOTAL = 1500;
const EXPECTED_GRADES = ["S4", "S5", "S6"];
const EXPECTED_TYPES = ["multiple-choice", "fill-in", "short-answer"];
const EXPECTED_DIFFICULTIES = ["Foundation", "Core", "Challenge", "Exam"];
const EXPECTED_GRADE_COUNT = 500;
const EXPECTED_TYPE_TOTALS = { "multiple-choice": 200, "fill-in": 175, "short-answer": 125 };
const EXPECTED_DIFFICULTY_TOTALS = { Foundation: 125, Core: 200, Challenge: 125, Exam: 50 };

const REQUIRED_FIELDS = [
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

const FORBIDDEN_SOURCE_PATTERNS = [
  { code: "source-ocr", regex: /\bOCR\b|光学字符识别|识别文本/i },
  { code: "source-screenshot", regex: /截图|截屏|扫描图|扫描件|图片来源|教材图片/ },
  { code: "source-page", regex: /第\s*\d+\s*页|页码|页\s*\d+|P\.\s*\d+/i },
  { code: "source-original", regex: /原题|原卷|原教材|教材原文|课本原文|照抄|改编自|来源于|摘自/ },
  { code: "source-file", regex: /\.pdf\b|\.docx\b|\.zip\b|\.jpg\b|\.png\b|文件名|路径/iu }
];

const MISSING_VISUAL_PATTERNS = [
  /如图(?:所示)?/,
  /下图/,
  /上图/,
  /右图/,
  /左图/,
  /(?:^|[，。；：:\s])图中(?:可以|有|阴影|涂色|显示|给出)?/,
  /根据图(?:形|表|像)?/,
  /观察下面的图/
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
  /没有正确答案/
];

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
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

function lcm(first, second) {
  return Math.abs(first * second) / gcd(first, second);
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

function stripPromptPrefix(prompt) {
  return String(prompt ?? "")
    .replace(/^V3安全变式\d+[:：]/, "")
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
      rule: "v3-set-union-multiple-count",
      regex: /设全集 U=\{1,2,3,\.\.\.,(-?\d+)\}，A 为 U 中能被 (-?\d+) 整除的数，B 为 U 中能被 (-?\d+) 整除的数。求 A∪B 的元素个数。/,
      solve: ([, upper, first, second]) => {
        const n = Number(upper);
        const a = Number(first);
        const b = Number(second);
        return Math.floor(n / a) + Math.floor(n / b) - Math.floor(n / lcm(a, b));
      }
    },
    {
      rule: "v3-linear-inequality-integer-count",
      regex: /求不等式组 x\+(-?\d+)>(-?\d+)，x≤(-?\d+) 的整数解个数。/,
      solve: ([, addend, right, upper]) => Math.max(0, Number(upper) - (Number(right) - Number(addend)))
    },
    {
      rule: "v3-log-definition-sum",
      regex: /已知 log_(\d+)\(\d+\^(-?\d+)\)=u，log_\d+\(\d+\^(-?\d+)\)=v，求 u\+v。/,
      solve: ([, , firstExponent, secondExponent]) => Number(firstExponent) + Number(secondExponent)
    },
    {
      rule: "v3-exponential-linked-value",
      regex: /函数 f\(x\)=(-?\d+)\^x，若 f\(t\)=(-?\d+)，求 f\(t-1\)。/,
      solve: ([, base, value]) => {
        const b = Number(base);
        const exponent = Math.round(Math.log(Number(value)) / Math.log(b));
        return b ** (exponent - 1);
      }
    },
    {
      rule: "v3-linear-function-difference",
      regex: /已知 f\(x\)=(-?\d+)x\+(-?\d+)，定义 g\(x\)=f\(x\+(-?\d+)\)-f\(x\)。求 g\((-?\d+)\)。/,
      solve: ([, slope, , shift]) => Number(slope) * Number(shift)
    },
    {
      rule: "v3-cosine-law-square",
      regex: /在三角形 ABC 中，AB=(-?\d+)，AC=(-?\d+)，且 ∠A=60°。求 BC²。/,
      solve: ([, first, second]) => Number(first) ** 2 + Number(second) ** 2 - Number(first) * Number(second)
    },
    {
      rule: "v3-trig-period",
      regex: /函数 y=(-?\d+)sin\(2x\+(-?\d+)π\/6\) 的最小正周期是多少？/,
      solve: () => "π"
    },
    {
      rule: "v3-plane-vector-identity",
      regex: /已知向量 u=\((-?\d+),(-?\d+)\)，v=\((-?\d+),(-?\d+)\)，求 \|u\+v\|²-\|u\|²-\|v\|²。/,
      solve: ([, ax, ay, bx, by]) => 2 * (Number(ax) * Number(bx) + Number(ay) * Number(by))
    },
    {
      rule: "v3-complex-transform",
      regex: /复数 z=\((-?\d+)\+(-?\d+)i\)\+\((-?\d+)-(-?\d+)i\)，w=\(1\+i\)z，求 Re\(w\)\+Im\(w\)。/,
      solve: ([, firstReal, , secondReal]) => 2 * (Number(firstReal) + Number(secondReal))
    },
    {
      rule: "v3-cuboid-adjacent-face-sum",
      regex: /长方体中同一顶点出发的三条互相垂直棱长分别为 (-?\d+)、(-?\d+)、(-?\d+)。求含有长为 -?\d+ 的棱的两个相邻面的面积之和。/,
      solve: ([, first, second, third]) => Number(first) * Number(second) + Number(first) * Number(third)
    },
    {
      rule: "v3-two-cuboid-volume-sum",
      regex: /一个长方体的长、宽、高分别为 (-?\d+)、(-?\d+)、(-?\d+)；另一个长方体的长、宽、高分别为 (-?\d+)、(-?\d+)、(-?\d+)。求两个长方体体积之和。/,
      solve: ([, l1, w1, h1, l2, w2, h2]) => Number(l1) * Number(w1) * Number(h1) + Number(l2) * Number(w2) * Number(h2)
    },
    {
      rule: "v3-two-red-without-replacement",
      regex: /袋中有 (-?\d+) 个红球和 (-?\d+) 个蓝球，不放回连续取出 2 个。求两次都取到红球的概率。/,
      solve: ([, red, blue]) => formatFraction(Number(red) * (Number(red) - 1), (Number(red) + Number(blue)) * (Number(red) + Number(blue) - 1))
    },
    {
      rule: "v3-mean-after-adding-value",
      regex: /一组数据为 (-?\d+)，(-?\d+)，(-?\d+)，若再加入一个数 x 后，四个数平均数比原平均数大 (-?\d+)，求 x。/,
      solve: ([, first, second, third, increase]) => {
        const mean = (Number(first) + Number(second) + Number(third)) / 3;
        return formatNumber(4 * (mean + Number(increase)) - Number(first) - Number(second) - Number(third));
      }
    },
    {
      rule: "v3-parallel-line-value",
      regex: /直线 l 经过点 \((-?\d+),(-?\d+)\) 和 \((-?\d+),(-?\d+)\)。直线 m 与 l 平行，且经过点 \(0,(-?\d+)\)。求直线 m 在 x=2 时的 y 坐标。/,
      solve: ([, x1, y1, x2, y2, intercept]) => formatNumber(((Number(y2) - Number(y1)) / (Number(x2) - Number(x1))) * 2 + Number(intercept))
    },
    {
      rule: "v3-ellipse-focal-distance-squared",
      regex: /椭圆 x²\/(-?\d+)\+y²\/(-?\d+)=1 的两个焦点为 F1，F2。求 \|F1F2\|²。/,
      solve: ([, aSquared, bSquared]) => 4 * (Number(aSquared) - Number(bSquared))
    },
    {
      rule: "v3-space-vector-translation",
      regex: /空间向量 p=\((-?\d+),(-?\d+),(-?\d+)\)，q=\(1,1,1\)，求 \|p\+q\|²-\|p\|²。/,
      solve: ([, x, y, z]) => 2 * (Number(x) + Number(y) + Number(z)) + 3
    },
    {
      rule: "v3-arithmetic-series-sum",
      regex: /等差数列首项为 (-?\d+)，公差为 (-?\d+)，第 (-?\d+) 项为 (-?\d+)。求前 \d+ 项和。/,
      solve: ([, first, , term, nth]) => formatNumber((Number(term) * (Number(first) + Number(nth))) / 2)
    },
    {
      rule: "v3-derivative-tangent-y-intercept",
      regex: /函数 f\(x\)=(-?\d+)x²\+(-?\d+)x\+(-?\d+) 在 x=(-?\d+) 处的切线与 y 轴交于点 \(0,k\)，求 k。/,
      solve: ([, quadratic, , constant, input]) => Number(constant) - Number(quadratic) * Number(input) ** 2
    },
    {
      rule: "v3-choose-leaders-recorder",
      regex: /从 (-?\d+) 名同学中选 2 名负责人，再从剩余同学中选 1 名记录员，共有多少种不同安排？/,
      solve: ([, total]) => (Number(total) * (Number(total) - 1) * (Number(total) - 2)) / 2
    },
    {
      rule: "v3-binomial-one-success",
      regex: /一次独立试验成功的概率为 (-?\d+)\/(-?\d+)，连续独立试验 2 次。求恰好成功 1 次的概率。/,
      solve: ([, success, total]) => formatFraction(2 * Number(success) * (Number(total) - Number(success)), Number(total) ** 2)
    }
  ];

  for (const pattern of patterns) {
    const match = prompt.match(pattern.regex);
    if (match) return buildSolved(pattern.rule, pattern.solve(match));
  }
  return { status: "needs-review", solverRule: "unmatched-template", independentAnswer: "" };
}

function normalizePromptForCrossBank(text) {
  return String(text ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, "");
}

function loadPriorPromptSet() {
  const rows = priorBankDirs.flatMap((dir) => readJsonl(path.join(__dirname, dir, "questions.jsonl")));
  return {
    priorRows: rows.length,
    prompts: new Set(rows.map((row) => normalizePromptForCrossBank(row.promptZhHans)).filter(Boolean))
  };
}

function sourceRiskText(row) {
  return [row.promptZhHans, ...(row.optionsZhHans ?? []), row.answer, ...(row.acceptedAnswers ?? []), row.explanationZhHans].join("\n");
}

function auditRow(row) {
  const issues = [];
  const text = sourceRiskText(row);
  if (row.__parseError) issues.push({ code: "parse-error", severity: "P0", detail: row.__parseError });
  for (const field of REQUIRED_FIELDS) {
    if (!(field in row)) issues.push({ code: "missing-field", severity: "P1", detail: field });
  }
  if (!/^hjb-high-ds-v3-s[456]-\d{3}$/.test(row.id ?? "")) issues.push({ code: "bad-v3-id", severity: "P1", detail: row.id });
  if (!EXPECTED_GRADES.includes(row.grade)) issues.push({ code: "bad-grade", severity: "P1", detail: row.grade });
  if (!EXPECTED_TYPES.includes(row.type)) issues.push({ code: "bad-type", severity: "P1", detail: row.type });
  if (!EXPECTED_DIFFICULTIES.includes(row.difficulty)) issues.push({ code: "bad-difficulty", severity: "P1", detail: row.difficulty });
  if (!Array.isArray(row.conceptIds) || !row.conceptIds.length) issues.push({ code: "missing-concepts", severity: "P1", detail: "conceptIds" });
  if (!Array.isArray(row.evidenceCardIds) || !row.evidenceCardIds.length) issues.push({ code: "missing-evidence", severity: "P1", detail: "evidenceCardIds" });
  if (!Array.isArray(row.examPatternCardIds) || !row.examPatternCardIds.length) issues.push({ code: "missing-evidence", severity: "P1", detail: "examPatternCardIds" });
  if (!String(row.promptZhHans ?? "").trim()) issues.push({ code: "missing-prompt", severity: "P1", detail: "promptZhHans" });
  if (!String(row.answer ?? "").trim()) issues.push({ code: "missing-answer", severity: "P1", detail: "answer" });
  if (!Array.isArray(row.acceptedAnswers) || !row.acceptedAnswers.length) issues.push({ code: "missing-accepted-answers", severity: "P1", detail: "acceptedAnswers" });
  if (!String(row.explanationZhHans ?? "").trim()) issues.push({ code: "missing-explanation", severity: "P1", detail: "explanationZhHans" });

  if (row.type === "multiple-choice") {
    const options = Array.isArray(row.optionsZhHans) ? row.optionsZhHans : [];
    if (options.length !== 4) issues.push({ code: "bad-mc-options", severity: "P1", detail: `options length ${options.length}` });
    if (new Set(options.map(normalizeIdentity)).size !== options.length) issues.push({ code: "duplicate-mc-options", severity: "P1", detail: "duplicate options" });
    if (!options.includes(row.answer)) issues.push({ code: "answer-not-option", severity: "P1", detail: row.answer });
  } else if (Array.isArray(row.optionsZhHans) && row.optionsZhHans.length) {
    issues.push({ code: "non-mc-has-options", severity: "P1", detail: row.type });
  }

  for (const { code, regex } of FORBIDDEN_SOURCE_PATTERNS) {
    if (regex.test(text)) issues.push({ code, severity: "P0", detail: "source/reference wording detected" });
  }
  for (const regex of MISSING_VISUAL_PATTERNS) {
    if (regex.test(text)) issues.push({ code: "missing-visual-reference", severity: "P1", detail: "visual reference without diagramSpec" });
  }
  for (const regex of CONTRADICTION_PATTERNS) {
    if (regex.test(text)) issues.push({ code: "self-contradiction-wording", severity: "P1", detail: "contradiction wording detected" });
  }
  if (row.sourceDistanceStatus !== "passed-auto-source-scan") {
    issues.push({ code: "source-distance-not-passed", severity: "P1", detail: row.sourceDistanceStatus });
  }
  if (row.mathQaStatus !== "pending-manual") issues.push({ code: "math-qa-not-pending", severity: "P1", detail: row.mathQaStatus });
  if (row.terminologyQaStatus !== "pending-manual") issues.push({ code: "terminology-qa-not-pending", severity: "P1", detail: row.terminologyQaStatus });

  const solved = solveFromPrompt(row);
  if (solved.status !== "pass") {
    issues.push({ code: "unmatched-solver-template", severity: "P1", detail: solved.solverRule });
  } else if (!matchesAnyAccepted(solved.independentAnswer, row)) {
    issues.push({
      code: "independent-answer-mismatch",
      severity: "P1",
      detail: `independent ${solved.independentAnswer}; row ${row.answer}`
    });
  }

  const severityRank = { P0: 0, P1: 1, P2: 2 };
  const topSeverity = issues.length ? issues.map((issue) => issue.severity).sort((a, b) => severityRank[a] - severityRank[b])[0] : "none";
  return {
    questionId: row.id,
    grade: row.grade,
    volume: row.volume,
    chapter: row.chapter,
    type: row.type,
    difficulty: row.difficulty,
    solverRule: solved.solverRule,
    independentAnswer: solved.independentAnswer,
    answer: row.answer,
    acceptedAnswers: Array.isArray(row.acceptedAnswers) ? row.acceptedAnswers.join(" | ") : "",
    qaStatus: issues.length ? "needs-review" : "pass",
    severity: topSeverity,
    issueCodes: issues.map((issue) => issue.code).join(" | "),
    issueDetails: issues.map((issue) => `${issue.code}: ${issue.detail}`).join(" | "),
    recommendedAction: issues.length ? "Rewrite or manually approve before any app integration." : "Include in S18 pass-sample review before app integration."
  };
}

function buildInventoryIssues(rows, auditRows, crossBankStats) {
  const issues = [];
  const gradeCounts = countBy(rows.map((row) => row.grade));
  const typeCounts = countBy(rows.map((row) => `${row.grade}:${row.type}`));
  const difficultyCounts = countBy(rows.map((row) => `${row.grade}:${row.difficulty}`));
  const idCounts = countBy(rows.map((row) => row.id));
  const promptCounts = countBy(rows.map((row) => normalizeIdentity(row.promptZhHans)));
  if (rows.length !== EXPECTED_TOTAL) issues.push(`Expected ${EXPECTED_TOTAL} questions; found ${rows.length}.`);
  for (const grade of EXPECTED_GRADES) {
    if ((gradeCounts[grade] || 0) !== EXPECTED_GRADE_COUNT) issues.push(`Expected ${grade} to have ${EXPECTED_GRADE_COUNT}; found ${gradeCounts[grade] || 0}.`);
    for (const type of EXPECTED_TYPES) {
      const key = `${grade}:${type}`;
      if ((typeCounts[key] || 0) !== EXPECTED_TYPE_TOTALS[type]) issues.push(`Expected ${grade} ${type} ${EXPECTED_TYPE_TOTALS[type]}; found ${typeCounts[key] || 0}.`);
    }
    for (const difficulty of EXPECTED_DIFFICULTIES) {
      const key = `${grade}:${difficulty}`;
      if ((difficultyCounts[key] || 0) !== EXPECTED_DIFFICULTY_TOTALS[difficulty]) {
        issues.push(`Expected ${grade} ${difficulty} ${EXPECTED_DIFFICULTY_TOTALS[difficulty]}; found ${difficultyCounts[key] || 0}.`);
      }
    }
  }
  const duplicateIds = Object.entries(idCounts).filter(([, count]) => count > 1);
  const duplicatePrompts = Object.entries(promptCounts).filter(([key, count]) => key && count > 1);
  if (duplicateIds.length) issues.push(`Duplicate IDs: ${duplicateIds.map(([id]) => id).join(", ")}.`);
  if (duplicatePrompts.length) issues.push(`Duplicate exact prompts: ${duplicatePrompts.length}.`);
  if (crossBankStats.duplicateCount > 0) issues.push(`Cross-bank exact prompt duplicates: ${crossBankStats.duplicateCount}.`);
  if (auditRows.some((row) => row.qaStatus !== "pass")) {
    issues.push(`Rows needing review from row-level audit: ${auditRows.filter((row) => row.qaStatus !== "pass").length}.`);
  }
  return { issues, gradeCounts, typeCounts, difficultyCounts, duplicateIds, duplicatePrompts };
}

function selectManualQueue(rows, auditRows) {
  const queueById = new Map();
  const add = (row, reason) => {
    const existing = queueById.get(row.id);
    queueById.set(row.id, {
      questionId: row.id,
      reviewReason: existing ? `${existing.reviewReason} | ${reason}` : reason,
      grade: row.grade,
      type: row.type,
      difficulty: row.difficulty,
      topicId: row.topicId,
      chapter: row.chapter,
      promptZhHans: row.promptZhHans,
      answer: row.answer,
      explanationZhHans: row.explanationZhHans
    });
  };
  const issueIds = new Set(auditRows.filter((row) => row.qaStatus !== "pass").map((row) => row.questionId));
  rows.filter((row) => issueIds.has(row.id)).forEach((row) => add(row, "auto-issue"));
  for (const grade of EXPECTED_GRADES) {
    rows
      .filter((row) => row.grade === grade && !issueIds.has(row.id))
      .sort((a, b) => stableHash(`${a.id}:${a.promptZhHans}`) - stableHash(`${b.id}:${b.promptZhHans}`))
      .slice(0, 50)
      .forEach((row) => add(row, "grade-pass-sample"));
  }
  for (const grade of EXPECTED_GRADES) {
    for (const type of EXPECTED_TYPES) {
      const row = rows.find((candidate) => candidate.grade === grade && candidate.type === type);
      if (row) add(row, "grade-type-coverage");
    }
    for (const difficulty of EXPECTED_DIFFICULTIES) {
      const row = rows.find((candidate) => candidate.grade === grade && candidate.difficulty === difficulty);
      if (row) add(row, "grade-difficulty-coverage");
    }
  }
  return Array.from(queueById.values()).sort((a, b) => a.grade.localeCompare(b.grade) || a.questionId.localeCompare(b.questionId));
}

function buildMarkdownReport({ rows, auditRows, inventory, crossBankStats, manualQueue }) {
  const p0 = auditRows.filter((row) => row.severity === "P0").length;
  const p1 = auditRows.filter((row) => row.severity === "P1").length;
  const pass = auditRows.filter((row) => row.qaStatus === "pass").length;
  return [
    `# ${packageLabel} Solvability Audit`,
    "",
    `- Date: ${new Date().toISOString().slice(0, 10)}`,
    "- Session ID: S18",
    `- Total rows: ${rows.length}`,
    `- Passed rows: ${pass}`,
    `- Needs review rows: ${auditRows.length - pass}`,
    `- P0 rows: ${p0}`,
    `- P1 rows: ${p1}`,
    `- Inventory issues: ${inventory.issues.length}`,
    `- Cross-bank exact prompt duplicates: ${crossBankStats.duplicateCount} across ${crossBankStats.priorRows} prior rows`,
    `- Manual review queue rows: ${manualQueue.length}`,
    "",
    "## Verdict",
    "",
    p0 || p1 || inventory.issues.length
      ? "Blocked for app integration. Keep candidate-only and remediate or manually approve flagged rows."
      : "Auto solvability and source-distance gates passed. Candidate remains pending S18 manual review and owner approval before any app integration.",
    "",
    "## Inventory Issues",
    "",
    ...(inventory.issues.length ? inventory.issues.map((issue) => `- ${issue}`) : ["- None"]),
    "",
    "## Manual Review Queue",
    "",
    "- Includes all auto-issue rows.",
    "- Includes at least 50 pass-sample rows per grade.",
    "- Includes explicit grade/type and grade/difficulty coverage anchors."
  ].join("\n");
}

function writeReleaseDecision({ inventory, auditRows }) {
  const p0 = auditRows.filter((row) => row.severity === "P0").length;
  const p1 = auditRows.filter((row) => row.severity === "P1").length;
  const decision =
    p0 || p1 || inventory.issues.length
      ? "blocked-auto-solvability-or-inventory-issues"
      : "candidate-only-auto-solvability-green-pending-s18-manual-review";
  const reason =
    p0 || p1 || inventory.issues.length
      ? `Automated audit found P0=${p0}, P1=${p1}, inventory issues=${inventory.issues.length}.`
      : "Automated count, source-distance, schema, cross-bank duplicate, and independent-template solvability checks passed with 0 P0/P1.";
  fs.writeFileSync(
    RELEASE_DECISION_MD,
    [
      `# S18 Promotability Decision - ${packageLabel}`,
      "",
      `- Date: ${new Date().toISOString().slice(0, 10)}`,
      "- Session ID: S18",
      `- Decision: ${decision}`,
      `- Reason: ${reason}`,
      "- App integration status: Not approved. This V3 package is candidate-only and must not be connected to production question-bank data, App UI, API, or release workflows until S18 manual review passes and the owner explicitly approves integration planning."
    ].join("\n") + "\n"
  );
}

function main() {
  if (!fs.existsSync(INPUT)) throw new Error(`Missing generated input: ${INPUT}`);
  const rows = readJsonl(INPUT);
  const auditRows = rows.map(auditRow);
  const prior = loadPriorPromptSet();
  const duplicateIds = rows
    .filter((row) => prior.prompts.has(normalizePromptForCrossBank(row.promptZhHans)))
    .map((row) => row.id);
  const crossBankStats = { priorRows: prior.priorRows, duplicateCount: duplicateIds.length, duplicateIds };
  const inventory = buildInventoryIssues(rows, auditRows, crossBankStats);
  const manualQueue = selectManualQueue(rows, auditRows);
  const payload = {
    packageLabel,
    generatedAt: new Date().toISOString(),
    summary: {
      totalRows: rows.length,
      passRows: auditRows.filter((row) => row.qaStatus === "pass").length,
      needsReviewRows: auditRows.filter((row) => row.qaStatus !== "pass").length,
      p0Rows: auditRows.filter((row) => row.severity === "P0").length,
      p1Rows: auditRows.filter((row) => row.severity === "P1").length,
      inventoryIssues: inventory.issues,
      crossBankStats,
      manualQueueRows: manualQueue.length
    },
    rows: auditRows
  };
  fs.writeFileSync(AUDIT_JSON, `${JSON.stringify(payload, null, 2)}\n`);
  writeCsv(AUDIT_CSV, auditRows, [
    "questionId",
    "grade",
    "volume",
    "chapter",
    "type",
    "difficulty",
    "solverRule",
    "independentAnswer",
    "answer",
    "acceptedAnswers",
    "qaStatus",
    "severity",
    "issueCodes",
    "issueDetails",
    "recommendedAction"
  ]);
  writeCsv(MANUAL_QUEUE_CSV, manualQueue, [
    "questionId",
    "reviewReason",
    "grade",
    "type",
    "difficulty",
    "topicId",
    "chapter",
    "promptZhHans",
    "answer",
    "explanationZhHans"
  ]);
  fs.writeFileSync(AUDIT_MD, `${buildMarkdownReport({ rows, auditRows, inventory, crossBankStats, manualQueue })}\n`);
  writeReleaseDecision({ inventory, auditRows });

  if (payload.summary.p0Rows || payload.summary.p1Rows || inventory.issues.length) {
    console.error(`${packageLabel}: solvability audit blocked with P0=${payload.summary.p0Rows}, P1=${payload.summary.p1Rows}, inventory=${inventory.issues.length}`);
    process.exitCode = 1;
  } else {
    console.log(`${packageLabel}: solvability audit passed for ${rows.length} rows; manual queue ${manualQueue.length}`);
  }
}

main();
