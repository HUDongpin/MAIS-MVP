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
const MANUAL_RESULTS_JSON = path.join(__dirname, "quality-manual-review-results.json");
const RELEASE_DECISION_MD = path.join(__dirname, "s18-promotability-decision.md");

const packageVersion = "V2";
const packageLabel = `Mainland HJB High Generated Bank ${packageVersion}`;
const physicalSourceDirectory = path.basename(__dirname);
const EXPECTED_TOTAL = 1500;
const EXPECTED_GRADES = ["S4", "S5", "S6"];
const EXPECTED_TYPES = ["multiple-choice", "fill-in", "short-answer"];
const EXPECTED_DIFFICULTIES = ["Foundation", "Core", "Challenge", "Exam"];
const EXPECTED_GRADE_COUNT = 500;
const PASS_SAMPLE_PER_GRADE = 50;

const REQUIRED_FIELDS = [
  "id",
  "grade",
  "topicId",
  "topicTitleZhHans",
  "volume",
  "chapter",
  "difficulty",
  "type",
  "promptZhHans",
  "optionsZhHans",
  "answer",
  "acceptedAnswers",
  "explanationZhHans"
];

const MISSING_VISUAL_PATTERNS = [
  /如图(?:所示)?/,
  /下图/,
  /上图/,
  /右图/,
  /左图/,
  /图中/,
  /根据图(?:形|表|像)?/,
  /观察下面的图/,
  /阴影部分/
];

const SELF_CONTRADICTION_PATTERNS = [
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

const AMBIGUITY_PATTERNS = [
  /任选/,
  /答案可多种/,
  /答案不固定/,
  /开放性答案/,
  /合理即可/,
  /等$/
];

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

function readManualReviewResults(filePath) {
  if (!fs.existsSync(filePath)) return new Map();
  const payload = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const reviews = Array.isArray(payload) ? payload : payload.reviews;
  return new Map((reviews ?? []).map((review) => [review.questionId, review]));
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

function stripPromptPrefix(prompt) {
  return String(prompt ?? "")
    .replace(/^二轮变式\d+[:：]/, "")
    .replace(/^三轮变式\d+[:：]/, "")
    .replace(/^变式\d+[:：]/, "")
    .replace(/^(选择|填空|解答)[:：]/, "")
    .trim();
}

function stripAnswerDecoration(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/^[A-D][.．、]\s*/i, "")
    .replace(/^答案(?:为|是)?[:：]?\s*/, "")
    .replace(/^约\s*/, "")
    .replace(/个$/, "");
}

function normalizeIdentity(value) {
  return stripAnswerDecoration(value)
    .toLowerCase()
    .replace(/[−–—]/g, "-")
    .replace(/\s+/g, "")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/π/g, "pi")
    .replace(/√/g, "sqrt")
    .replace(/[，、；;：:。！？?!（）()【】\[\]{}“”"‘’']/g, "");
}

function parseScalar(value) {
  const normalized = normalizeIdentity(value);
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

function pushIssue(issues, code, severity, detail) {
  issues.push({ code, severity, detail });
}

function auditPromptRedFlags(row, issues) {
  const text = [row.promptZhHans, ...(row.optionsZhHans ?? []), row.answer, ...(row.acceptedAnswers ?? []), row.explanationZhHans].join("\n");
  if (row.__parseError) pushIssue(issues, "parse-error", "P0", row.__parseError);
  for (const field of REQUIRED_FIELDS) {
    if (!(field in row)) pushIssue(issues, "missing-field", "P0", field);
  }
  if (!String(row.promptZhHans ?? "").trim()) pushIssue(issues, "missing-prompt", "P0", "promptZhHans is empty");
  if (!String(row.answer ?? "").trim()) pushIssue(issues, "missing-answer", "P0", "answer is empty");
  if (!Array.isArray(row.acceptedAnswers) || !row.acceptedAnswers.length) pushIssue(issues, "missing-accepted-answers", "P1", "acceptedAnswers is empty");
  if (!String(row.explanationZhHans ?? "").trim()) pushIssue(issues, "missing-explanation", "P1", "explanationZhHans is empty");
  if (!EXPECTED_GRADES.includes(row.grade)) pushIssue(issues, "bad-grade", "P0", String(row.grade));
  if (!EXPECTED_TYPES.includes(row.type)) pushIssue(issues, "bad-type", "P0", String(row.type));
  if (!EXPECTED_DIFFICULTIES.includes(row.difficulty)) pushIssue(issues, "bad-difficulty", "P0", String(row.difficulty));

  if (MISSING_VISUAL_PATTERNS.some((regex) => regex.test(text)) && !row.diagramSpec) {
    pushIssue(issues, "missing-visual-reference", "P0", "Prompt references a diagram/figure/shaded region but no diagramSpec is present.");
  }
  if (SELF_CONTRADICTION_PATTERNS.some((regex) => regex.test(text))) {
    pushIssue(issues, "self-contradiction-wording", "P0", "Self-contradiction or invalid-question wording detected.");
  }
  if (AMBIGUITY_PATTERNS.some((regex) => regex.test(String(row.answer ?? ""))) && !Array.isArray(row.acceptedAnswers)) {
    pushIssue(issues, "ambiguous-answer-shape", "P1", "Stored answer appears open-ended without acceptedAnswers coverage.");
  }
}

function auditMcOptions(row, independentAnswer, answerMatchStatus, issues) {
  if (row.type !== "multiple-choice") {
    if (Array.isArray(row.optionsZhHans) && row.optionsZhHans.length) {
      pushIssue(issues, "non-mc-has-options", "P1", "Non-multiple-choice row has options.");
      return { status: "fail", detail: "Non-multiple-choice row has options." };
    }
    return { status: "not-applicable", detail: "" };
  }

  const options = Array.isArray(row.optionsZhHans) ? row.optionsZhHans : [];
  if (options.length !== 4) {
    const detail = `Expected 4 options; found ${options.length}.`;
    pushIssue(issues, "bad-mc-options", "P0", detail);
    return { status: "fail", detail };
  }
  if (new Set(options.map(normalizeIdentity)).size !== options.length) {
    const detail = "Duplicate options after normalization.";
    pushIssue(issues, "duplicate-mc-options", "P0", detail);
    return { status: "fail", detail };
  }
  if (!independentAnswer) return { status: "not-checkable", detail: "No independent answer because the row is a solver gap." };

  const matchingOptions = options.filter((option) => answerMatches(option, independentAnswer));
  if (matchingOptions.length !== 1) {
    const detail = `Expected exactly one option to match independent answer; found ${matchingOptions.length}.`;
    pushIssue(issues, "mc-option-match-count", "P0", detail);
    return { status: "fail", detail };
  }
  if (!answerMatches(row.answer, matchingOptions[0])) {
    const detail = `Stored answer does not match the matching option ${matchingOptions[0]}.`;
    pushIssue(issues, "mc-answer-not-option", "P0", detail);
    return { status: "fail", detail };
  }
  if (answerMatchStatus !== "pass") {
    const detail = "Stored answer failed accepted-answer match.";
    pushIssue(issues, "mc-answer-key-mismatch", "P0", detail);
    return { status: "fail", detail };
  }
  return { status: "pass", detail: "" };
}

function topSeverity(issues) {
  const rank = { P0: 0, P1: 1, P2: 2 };
  return issues.length ? issues.map((issue) => issue.severity).sort((a, b) => rank[a] - rank[b])[0] : "none";
}

function decisionFor({ severity, solvableStatus, answerMatchStatus, mcOptionStatus }) {
  if (severity === "none" && solvableStatus === "pass" && answerMatchStatus === "pass" && (mcOptionStatus === "pass" || mcOptionStatus === "not-applicable")) {
    return "approve";
  }
  if (severity === "P0" || solvableStatus === "fail" || answerMatchStatus === "fail" || mcOptionStatus === "fail") return "rewrite";
  if (solvableStatus === "solver-gap" || answerMatchStatus === "not-checkable" || mcOptionStatus === "not-checkable") return "needs-second-review";
  return "needs-second-review";
}

function isSolvabilityApproved(status) {
  return status === "pass" || status === "manual-pass";
}

function isAnswerApproved(status) {
  return status === "pass" || status === "manual-pass";
}

function applyManualReview(row, manualReview) {
  if (!manualReview) {
    return {
      ...row,
      manualReviewStatus: "pending",
      manualReviewType: "",
      manualReviewer: "",
      manualIssueCode: "",
      manualNotes: "",
      manualRecommendedAction: ""
    };
  }

  const approved = manualReview.manualDecision === "approve";
  const issueCode = manualReview.manualIssueCode || (approved ? "" : "manual-review-fail");
  const issueDetail = issueCode ? `${issueCode}: ${manualReview.manualNotes || "S18 manual review did not approve this row."}` : "";

  return {
    ...row,
    independentAnswer: manualReview.manualIndependentAnswer || row.independentAnswer || row.storedAnswer,
    solverRule: "manual-review",
    solvableStatus: manualReview.manualSolvableStatus || (approved ? "manual-pass" : "manual-fail"),
    answerMatchStatus: manualReview.manualAnswerMatchStatus || (approved ? "manual-pass" : "manual-fail"),
    mcOptionStatus: row.type === "multiple-choice" ? (approved ? "manual-pass" : "manual-fail") : row.mcOptionStatus,
    qaStatus: approved ? "pass" : "needs-review",
    severity: approved ? "none" : (manualReview.severity || "P0"),
    decision: approved ? "approve" : (manualReview.manualDecision || "rewrite"),
    issueCodes: approved ? "" : issueCode,
    issueDetails: approved ? "" : issueDetail,
    recommendedAction: approved
      ? "Approved by S18 manual independent solve / pass-sample review; eligible for candidate release pool after aggregate gates pass."
      : (manualReview.manualRecommendedAction || "Rewrite or remove before any app integration, then rerun structure and quality audits."),
    manualReviewStatus: "reviewed",
    manualReviewType: manualReview.reviewType || "",
    manualReviewer: manualReview.reviewer || "S18",
    manualIssueCode: issueCode,
    manualNotes: manualReview.manualNotes || "",
    manualRecommendedAction: manualReview.manualRecommendedAction || ""
  };
}

function auditQualityRow(row) {
  const issues = [];
  auditPromptRedFlags(row, issues);

  const solver = solveFromPrompt(row);
  const solvableStatus = solver.status === "pass" ? "pass" : solver.status;
  const answerMatchStatus = solvableStatus === "pass" ? (matchesAnyAccepted(solver.independentAnswer, row) ? "pass" : "fail") : "not-checkable";

  if (solvableStatus === "solver-gap") {
    pushIssue(issues, "solver-gap", "P1", "No deterministic solver rule matched the prompt; requires independent manual solve.");
  } else if (solvableStatus !== "pass") {
    pushIssue(issues, "not-independently-solvable", "P0", "Question is not independently solvable.");
  }
  if (answerMatchStatus === "fail") {
    pushIssue(issues, "answer-mismatch", "P0", `Independent answer ${solver.independentAnswer} does not match stored answer ${row.answer}.`);
  }

  const mc = auditMcOptions(row, solver.independentAnswer, answerMatchStatus, issues);
  const severity = topSeverity(issues);
  const qaStatus = severity === "none" ? "pass" : "needs-review";
  const decision = decisionFor({ severity, solvableStatus, answerMatchStatus, mcOptionStatus: mc.status });

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
    decision,
    issueCodes: issues.map((issue) => issue.code).join(" | "),
    issueDetails: issues.map((issue) => `${issue.code}: ${issue.detail}`).join(" | "),
    recommendedAction:
      decision === "approve"
        ? "Approve for automated quality gate; still include in S18 manual pass-sample before app integration."
        : decision === "needs-second-review"
          ? "Manual independent solve required before approval."
          : "Rewrite or remove before any app integration, then rerun quality audit."
  };
}

function addCandidate(queue, seenIds, row, reason) {
  if (!row || seenIds.has(row.questionId)) return;
  queue.push({ ...row, reviewReason: reason });
  seenIds.add(row.questionId);
}

function selectPassSampleForGrade(passRows, grade) {
  const gradeRows = passRows
    .filter((row) => row.grade === grade)
    .sort((a, b) => stableHash(`${a.questionId}:${a.promptZhHans}`) - stableHash(`${b.questionId}:${b.promptZhHans}`));
  const selected = [];
  const seenIds = new Set();

  for (const type of EXPECTED_TYPES) {
    for (const difficulty of EXPECTED_DIFFICULTIES) {
      addCandidate(selected, seenIds, gradeRows.find((row) => row.type === type && row.difficulty === difficulty), "grade-type-difficulty-pass-sample");
    }
  }
  for (const chapter of [...new Set(gradeRows.map((row) => row.chapter))].sort()) {
    addCandidate(selected, seenIds, gradeRows.find((row) => row.chapter === chapter), "grade-chapter-pass-sample");
  }

  const priority = { Exam: 0, Challenge: 1, Core: 2, Foundation: 3 };
  const fillRows = [...gradeRows].sort((a, b) => priority[a.difficulty] - priority[b.difficulty] || stableHash(`${a.questionId}:${a.promptZhHans}`) - stableHash(`${b.questionId}:${b.promptZhHans}`));
  for (const row of fillRows) {
    if (selected.length >= PASS_SAMPLE_PER_GRADE) break;
    addCandidate(selected, seenIds, row, "grade-pass-sample-fill");
  }

  return selected.slice(0, PASS_SAMPLE_PER_GRADE);
}

function selectManualQueue(auditRows) {
  const queue = auditRows
    .filter((row) => row.decision !== "approve")
    .map((row) => ({ ...row, reviewReason: "auto-quality-issue" }));
  const seenIds = new Set(queue.map((row) => row.questionId));
  const passRows = auditRows.filter((row) => row.decision === "approve");

  for (const grade of EXPECTED_GRADES) {
    for (const sample of selectPassSampleForGrade(passRows, grade)) {
      addCandidate(queue, seenIds, sample, sample.reviewReason);
    }
  }

  return queue.sort((a, b) => String(a.grade).localeCompare(String(b.grade)) || String(a.questionId).localeCompare(String(b.questionId)));
}

function buildInventoryIssues(rows, auditRows) {
  const issues = [];
  const gradeCounts = countBy(rows.map((row) => row.grade));
  const idCounts = countBy(rows.map((row) => row.id));
  const promptCounts = countBy(rows.map((row) => normalizeIdentity(row.promptZhHans)));
  if (rows.length !== EXPECTED_TOTAL) issues.push(`Expected ${EXPECTED_TOTAL} rows; found ${rows.length}.`);
  for (const grade of EXPECTED_GRADES) {
    if ((gradeCounts[grade] || 0) !== EXPECTED_GRADE_COUNT) issues.push(`Expected ${grade} to have ${EXPECTED_GRADE_COUNT}; found ${gradeCounts[grade] || 0}.`);
  }
  const duplicateIds = Object.entries(idCounts).filter(([, count]) => count > 1);
  const duplicatePrompts = Object.entries(promptCounts).filter(([key, count]) => key && count > 1);
  if (duplicateIds.length) issues.push(`Duplicate IDs: ${duplicateIds.map(([id]) => id).join(", ")}.`);
  if (duplicatePrompts.length) issues.push(`Duplicate exact prompts: ${duplicatePrompts.length}.`);

  const solverGapRows = auditRows.filter((row) => row.solvableStatus === "solver-gap").length;
  const unsolvableRows = auditRows.filter((row) => !isSolvabilityApproved(row.solvableStatus) && row.solvableStatus !== "solver-gap").length;
  const mismatchRows = auditRows.filter((row) => !isAnswerApproved(row.answerMatchStatus) && row.answerMatchStatus !== "not-checkable").length;
  const notCheckableRows = auditRows.filter((row) => row.answerMatchStatus === "not-checkable").length;
  const mcFailureRows = auditRows.filter((row) => row.mcOptionStatus === "fail" || row.mcOptionStatus === "manual-fail").length;
  const p0Rows = auditRows.filter((row) => row.severity === "P0").length;
  const p1Rows = auditRows.filter((row) => row.severity === "P1").length;
  if (solverGapRows) issues.push(`Solver gaps requiring manual independent solve: ${solverGapRows}.`);
  if (unsolvableRows) issues.push(`Solvability failures requiring rewrite/remove: ${unsolvableRows}.`);
  if (mismatchRows) issues.push(`Answer mismatches requiring rewrite/remove: ${mismatchRows}.`);
  if (notCheckableRows) issues.push(`Answer rows not checkable until rewrite/remove: ${notCheckableRows}.`);
  if (mcFailureRows) issues.push(`Multiple-choice option failures: ${mcFailureRows}.`);
  if (p0Rows) issues.push(`P0 rows unresolved: ${p0Rows}.`);
  if (p1Rows) issues.push(`P1 rows unresolved: ${p1Rows}.`);
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
  const decisionCounts = countBy(auditRows.map((row) => row.decision));
  const chapterFailureCounts = countBy(failingRows.map((row) => row.chapter));
  const issueCodeCounts = countBy(failingRows.flatMap((row) => String(row.issueCodes || "").split(" | ").filter(Boolean)));
  const solvableApprovedRows = auditRows.filter((row) => isSolvabilityApproved(row.solvableStatus)).length;
  const answerApprovedRows = auditRows.filter((row) => isAnswerApproved(row.answerMatchStatus)).length;
  const manualReviewedRows = auditRows.filter((row) => row.manualReviewStatus === "reviewed").length;
  const manualQueueComplete = manualQueue.every((row) => row.manualReviewStatus === "reviewed");
  const releaseRecommendation =
    inventoryIssues.length === 0 && manualQueueComplete
      ? `Green: ${EXPECTED_TOTAL}/${EXPECTED_TOTAL} ${packageVersion} rows are independently solvable, answer-key matched, and S18 manual queue approved; proceed to S04/S08 integration planning only.`
      : inventoryIssues.length === 0
        ? `Green: ${EXPECTED_TOTAL}/${EXPECTED_TOTAL} ${packageVersion} rows are independently solvable and answer-key matched; proceed to S18 manual sampling before any app integration.`
        : `Red: ${packageVersion} quality QA is blocked until failing rows are manually approved, rewritten, or removed.`;

  return `# ${packageLabel} Quality Audit

- Date: 2026-05-24
- Session ID: S18
- Scope: 1500 offline Shanghai Education Press / HuJiaoBan high-school candidate questions
- QA focus: independent solvability and answer-key match
- Physical source directory: \`${physicalSourceDirectory}\`; business, QA, app, and batch metadata label this package ${packageVersion}
- Method: deterministic row-level prompt-only solver plus red-flag scan; no live LLM, OCR, external textbook corpus, source body text, or stored answer leakage into solving

## Executive Summary

| Metric | Value |
| --- | --- |
| Expected questions | ${EXPECTED_TOTAL} |
| Actual questions | ${rows.length} |
| Solvable rows | ${solvableApprovedRows} |
| Solvable rate | ${percent(solvableApprovedRows, rows.length)} |
| Answer-matched rows | ${answerApprovedRows} |
| Answer-match rate | ${percent(answerApprovedRows, rows.length)} |
| Solver gaps | ${solvableCounts["solver-gap"] || 0} |
| Answer mismatches | ${(answerMatchCounts.fail || 0) + (answerMatchCounts["manual-fail"] || 0)} |
| MC option failures | ${(mcCounts.fail || 0) + (mcCounts["manual-fail"] || 0)} |
| P0 rows | ${severityCounts.P0 || 0} |
| P1 rows | ${severityCounts.P1 || 0} |
| P2 rows | ${severityCounts.P2 || 0} |
| Approved rows | ${decisionCounts.approve || 0} |
| Rewrite/remove rows | ${(decisionCounts.rewrite || 0) + (decisionCounts.remove || 0)} |
| Second-review rows | ${decisionCounts["needs-second-review"] || 0} |
| Manual review queue rows | ${manualQueue.length} |
| Manual reviewed rows | ${manualReviewedRows} |
| Release recommendation | ${releaseRecommendation} |

## Chapter Failure Distribution

| Chapter | Failing Rows |
| --- | --- |
${Object.keys(chapterFailureCounts).length ? Object.entries(chapterFailureCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([chapter, count]) => `| ${chapter} | ${count} |`).join("\n") : "| None | 0 |"}

## Issue Code Distribution

| Issue Code | Rows |
| --- | --- |
${Object.keys(issueCodeCounts).length ? Object.entries(issueCodeCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([code, count]) => `| ${code} | ${count} |`).join("\n") : "| None | 0 |"}

## Solver Coverage

| Solver Rule | Rows |
| --- | --- |
${Object.entries(countBy(auditRows.map((row) => row.solverRule))).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([rule, count]) => `| ${rule} | ${count} |`).join("\n")}

## Inventory Issues

| Issue |
| --- |
${inventoryIssues.length ? inventoryIssues.map((issue) => `| ${issue.replace(/\|/g, "\\|")} |`).join("\n") : "| None |"}

## Manual QA Requirements

- 100% of rows with \`decision != approve\` must receive independent human solving before promotion.
- The pass-sample queue adds ${PASS_SAMPLE_PER_GRADE} approved rows per grade, forcing grade/type/difficulty/chapter coverage and prioritizing Exam/Challenge rows.
- If manual sampling finds a serious mathematical error rate above 1% in any grade/topic/type bucket, expand that bucket to 100% manual review.
- App integration remains blocked until P0/P1 unresolved rows are 0 and both final solvability and final answer-match rates are 100%.
`;
}

function main() {
  const rows = readJsonl(INPUT);
  const manualReviews = readManualReviewResults(MANUAL_RESULTS_JSON);
  const autoAuditRows = rows.map(auditQualityRow);
  const auditRows = autoAuditRows.map((row) => applyManualReview(row, manualReviews.get(row.questionId)));
  const auditRowsById = new Map(auditRows.map((row) => [row.questionId, row]));
  const failingRows = auditRows.filter((row) => row.decision !== "approve");
  const manualQueue = selectManualQueue(autoAuditRows).map((row) => {
    const finalRow = auditRowsById.get(row.questionId) ?? row;
    return {
      ...finalRow,
      reviewReason: row.reviewReason,
      autoSolvableStatus: row.solvableStatus,
      autoAnswerMatchStatus: row.answerMatchStatus,
      autoSeverity: row.severity,
      autoDecision: row.decision
    };
  });
  const inventoryIssues = buildInventoryIssues(rows, auditRows);
  const manualQueueComplete = manualQueue.every((row) => row.manualReviewStatus === "reviewed");
  const summary = {
    reportDate: "2026-05-24",
    packageVersion,
    physicalSourceDirectory,
    expectedQuestions: EXPECTED_TOTAL,
    actualQuestions: rows.length,
    gradeCounts: countBy(rows.map((row) => row.grade)),
    typeCounts: countBy(rows.map((row) => row.type)),
    difficultyCounts: countBy(rows.map((row) => row.difficulty)),
    solvableStatusCounts: countBy(auditRows.map((row) => row.solvableStatus)),
    answerMatchStatusCounts: countBy(auditRows.map((row) => row.answerMatchStatus)),
    mcOptionStatusCounts: countBy(auditRows.map((row) => row.mcOptionStatus)),
    severityCounts: countBy(auditRows.map((row) => row.severity)),
    qaStatusCounts: countBy(auditRows.map((row) => row.qaStatus)),
    decisionCounts: countBy(auditRows.map((row) => row.decision)),
    solverRuleCounts: countBy(auditRows.map((row) => row.solverRule)),
    manualReviewStatusCounts: countBy(auditRows.map((row) => row.manualReviewStatus)),
    manualReviewResultsRows: manualReviews.size,
    solvableApprovedRows: auditRows.filter((row) => isSolvabilityApproved(row.solvableStatus)).length,
    answerApprovedRows: auditRows.filter((row) => isAnswerApproved(row.answerMatchStatus)).length,
    failingRows: failingRows.length,
    manualReviewQueueRows: manualQueue.length,
    inventoryIssues,
    releaseRecommendation:
      inventoryIssues.length === 0 && manualQueueComplete
        ? "quality-green-approved-for-integration-planning"
        : inventoryIssues.length === 0
          ? "quality-green-pending-s18-manual-sampling"
        : "quality-blocked-pending-manual-review-or-remediation"
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
    "decision",
    "issueCodes",
    "issueDetails",
    "recommendedAction",
    "manualReviewStatus",
    "manualReviewType",
    "manualReviewer",
    "manualIssueCode",
    "manualNotes",
    "manualRecommendedAction"
  ];
  fs.writeFileSync(AUDIT_JSON, `${JSON.stringify({ summary, rows: auditRows, failingRows }, null, 2)}\n`);
  writeCsv(AUDIT_CSV, auditRows, commonHeaders);
  writeCsv(FAILING_ROWS_CSV, failingRows, commonHeaders);
  writeCsv(MANUAL_QUEUE_CSV, manualQueue, [...commonHeaders, "reviewReason", "autoSolvableStatus", "autoAnswerMatchStatus", "autoSeverity", "autoDecision"]);
  fs.writeFileSync(AUDIT_MD, buildMarkdownReport({ rows, auditRows, failingRows, manualQueue, inventoryIssues }));
  fs.writeFileSync(
    RELEASE_DECISION_MD,
    `# S18 Promotability Decision - ${packageLabel}

- Date: 2026-05-24
- Session ID: S18
- Decision: ${summary.releaseRecommendation}
- Reason: ${summary.releaseRecommendation === "quality-green-approved-for-integration-planning"
      ? `S18 quality audit approved ${summary.decisionCounts.approve || 0}/${EXPECTED_TOTAL} rows with 0 P0/P1/P2, ${manualQueue.length}/${manualQueue.length} manual QA queue rows reviewed, 0 failing rows, and 0 inventory issues.`
      : inventoryIssues.length
        ? inventoryIssues.join(" ")
        : `Automated quality checks are green, but S18 manual queue approval is not complete (${manualQueue.filter((row) => row.manualReviewStatus === "reviewed").length}/${manualQueue.length}).`}
- App integration status: ${summary.releaseRecommendation === "quality-green-approved-for-integration-planning"
      ? "Approved for S04/S08 integration planning only. Do not publish to students or teachers until owner approval, production question-bank conversion, Lesson Page wiring, `npm run type-check`, relevant question-bank checks, `npm run build`, and browser QA pass."
      : "Not approved. Coordinate with S18 before S04/S08 production integration planning."}
`
  );
  console.log(`Quality audit complete for ${packageLabel}: ${summary.releaseRecommendation}; failing rows=${failingRows.length}; manual queue rows=${manualQueue.length}`);
  if (inventoryIssues.length) process.exitCode = 1;
}

main();
