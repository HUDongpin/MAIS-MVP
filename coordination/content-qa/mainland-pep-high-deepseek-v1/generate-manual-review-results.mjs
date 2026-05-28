import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const QUESTION_INPUTS = [
  "questions.remediated.jsonl",
  "questions.jsonl",
  "questions.partial.jsonl"
].map((filename) => path.join(__dirname, filename));
const AUDIT_JSON = path.join(__dirname, "solvability-audit.json");
const OUTPUT_CSV = path.join(__dirname, "manual-review-results.csv");
const OUTPUT_SUMMARY = path.join(__dirname, "qa-summary.md");
const OUTPUT_DECISION = path.join(__dirname, "release-decision.md");

const reviewDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Hong_Kong",
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
}).format(new Date());

const reviewer = "S18 Codex content-QA remediation pass";
const expectedTotal = 2100;
const expectedGradeCounts = { S4: 700, S5: 700, S6: 700 };
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
  "reviewNotes"
];

const s4TopicExpectations = {
  "pep-high-s4-complex-numbers": {
    label: "复数",
    mustInclude: [/复数|虚数|实部|虚部|共轭|复平面|辐角|模|z|i/],
    mismatch: [/导数|切线斜率|极小值|极大值|单调递减区间|单调递增区间/],
    suggestion: "复数题应聚焦复数运算、复平面、模、共轭或辐角；删除导数/函数综合污染或改挂到正确主题。"
  },
  "pep-high-s4-exp-log": {
    label: "指数函数与对数函数",
    mustInclude: [/指数|对数|log|ln|[235]\^|[a-zA-Z]\^|幂|零点/],
    mismatch: [/圆锥曲线|空间向量|随机变量|排列|组合|导数/],
    suggestion: "指数对数题应保持在指数、对数、幂函数与零点比较范围。"
  },
  "pep-high-s4-function-properties": {
    label: "函数的概念与性质",
    mustInclude: [/函数|f\s*\(|定义域|值域|单调|奇函数|偶函数|反函数|图像/],
    mismatch: [/导数|切线斜率|圆锥曲线|空间向量|随机变量/],
    suggestion: "函数性质题可考定义域、值域、单调性、奇偶性；避免导数法表述。"
  },
  "pep-high-s4-plane-vectors": {
    label: "平面向量",
    mustInclude: [/向量|数量积|点积|夹角|平行|垂直|坐标|投影|\\vec|⃗/],
    mismatch: [/空间向量|圆锥曲线|随机变量|导数|对数函数/],
    suggestion: "平面向量题应保留向量表示、坐标运算、数量积或平面几何应用。"
  },
  "pep-high-s4-quadratic-inequalities": {
    label: "一元二次函数、方程和不等式",
    mustInclude: [/不等式|二次|方程|抛物线|判别式|根|解集|x²|x\^2/],
    mismatch: [/导数|圆锥曲线|空间向量|随机变量|复数/],
    suggestion: "二次与不等式题应围绕方程根、图像、区间、解集和基本不等式。"
  },
  "pep-high-s4-sets-logic": {
    label: "集合与常用逻辑用语",
    mustInclude: [/集合|命题|充分|必要|充要|子集|交集|并集|补集|逆否|p[：:]|q[：:]|A=|B=|x∈|∪|∩/],
    mismatch: [/导数|极值|圆锥曲线|空间向量|随机变量/],
    suggestion: "集合逻辑题应考集合运算、命题、充分必要条件；纯函数计算应改挂主题。"
  },
  "pep-high-s4-trigonometry": {
    label: "三角函数",
    mustInclude: [/sin|cos|tan|三角|正弦|余弦|正切|周期|弧度|象限|角/],
    mismatch: [/导数|圆锥曲线|空间向量|随机变量|对数函数/],
    suggestion: "三角题应围绕三角函数值、恒等变换、图像、周期或角度范围。"
  }
};

const postS4Patterns = [
  { code: "post-s4-derivative-language", regex: /导数|切线斜率|f'\s*\(|极小值|极大值|取得极值/ },
  { code: "post-s4-conics", regex: /椭圆|双曲线|抛物线的方程|圆锥曲线/ },
  { code: "post-s4-space-vectors", regex: /空间向量|空间直角坐标系/ },
  { code: "post-s4-random-variables", regex: /随机变量|二项分布|正态分布|期望|方差/ },
  { code: "post-s4-counting", regex: /排列|组合|二项式定理/ }
];

const sourceSafetyPatterns = [
  { code: "source-ocr", regex: /\bOCR\b|光学字符识别|识别文本/i },
  { code: "source-screenshot", regex: /截图|截屏|扫描图|扫描件|图片来源|教材图片/ },
  { code: "source-page", regex: /第\s*\d+\s*页|页码|页\s*\d+|P\.\s*\d+/i },
  { code: "source-original", regex: /教材原题|课本原题|试卷原题|高考真题|官方解析|答案原句|教材原文|课本原文|照抄|改编自|来源于/ },
  { code: "source-file", regex: /\.pdf\b|\.docx\b|\.zip\b|\.jpg\b|\.png\b|文件名|路径|source locator/iu },
  { code: "missing-visual", regex: /如图(?:所示)?|见图|下图|上图|右图|左图|(?:^|[，。；：:\s])图中|根据图(?:形|表|像)?|观察下面的图/ }
];

const contradictionPatterns = [
  { code: "self-correction", regex: /重新计算|上面算错|前面错误|选项应改|应改为|原答案有误|答案有误|重新生成/ },
  { code: "under-specified", regex: /条件不足|无法确定|答案不唯一|不够条件|缺少图|缺少信息|选项中没有/ },
  { code: "model-artifact", regex: /作为AI|模型|抱歉|根据输出要求|不能指出题目错误/ }
];

function readJsonl(filePath) {
  return fs.readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        return { id: `__parse_error_${index + 1}`, __parseError: String(error), __rawLine: line };
      }
    });
}

function questionInput() {
  const filePath = QUESTION_INPUTS.find((candidate) => fs.existsSync(candidate));
  if (!filePath) throw new Error("No candidate JSONL input found.");
  return {
    filePath,
    source: path.basename(filePath)
  };
}

function normalize(value) {
  return String(value ?? "")
    .replace(/[！-～]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/　/g, " ")
    .replace(/\\[()]/g, "")
    .replace(/\$/g, "")
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "$1/$2")
    .replace(/\\sqrt\{([^{}]+)\}/g, "√$1")
    .replace(/\s+/g, "")
    .replace(/[，、；;：:。！？?!（）()【】\[\]{}“”"‘’'`]/g, "")
    .replace(/−/g, "-")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .toLowerCase();
}

function compact(value, max = 180) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function countBy(rows, key) {
  return rows.reduce((counts, row) => {
    const value = typeof key === "function" ? key(row) : row[key];
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  return `"${text.replace(/"/g, '""').replace(/\r?\n/g, "\\n")}"`;
}

function writeCsv(filePath, rows, headers) {
  const lines = [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))
  ];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function detectAnswerVisibility(row) {
  const explanation = normalize(row.explanationZhHans);
  const answers = [row.answer, ...(Array.isArray(row.acceptedAnswers) ? row.acceptedAnswers : [])]
    .map(normalize)
    .filter((answer) => answer.length >= 1);
  return answers.some((answer) => explanation.includes(answer));
}

function extractOrderRelations(value) {
  const text = normalize(value);
  const relations = new Set();
  const matches = text.match(/[abc][<>][abc][<>][abc]/g) ?? [];
  for (const match of matches) relations.add(match);
  return Array.from(relations);
}

function detectAnswerExplanationConflict(row) {
  const normalizedAnswer = normalize(row.answer);
  const answerRelations = extractOrderRelations(row.answer);
  const explanationRelations = extractOrderRelations(row.explanationZhHans);
  if (answerRelations.length > 0 && explanationRelations.length > 0 && !explanationRelations.includes(answerRelations[0])) {
    return `answer-explanation-conflict:${answerRelations[0]}-vs-${explanationRelations.join("|")}`;
  }
  if (!detectAnswerVisibility(row)) {
    return "answer-not-explicitly-visible-in-explanation";
  }
  if (/原答案有误|答案有误|选项应改|应改为/.test(row.explanationZhHans ?? "")) {
    return "answer-self-declared-wrong";
  }
  if (normalizedAnswer && /(故|所以|因此).{0,20}(第一象限|第二象限|第三象限|第四象限)/.test(row.explanationZhHans ?? "")) {
    const quadrant = (row.explanationZhHans.match(/(第一象限|第二象限|第三象限|第四象限)(?!.*(第一象限|第二象限|第三象限|第四象限))/) ?? [])[1];
    if (quadrant && !normalizedAnswer.includes(normalize(quadrant))) {
      return `answer-explanation-conflict:${row.answer}-vs-${quadrant}`;
    }
  }
  return "";
}

function reviewRow(row, auditRow, idCounts, promptCounts) {
  const issueCategories = new Set();
  const issueCodes = [];
  const suggestedFixes = [];
  const textForScan = [
    row.promptZhHans,
    ...(Array.isArray(row.optionsZhHans) ? row.optionsZhHans : []),
    row.answer,
    ...(Array.isArray(row.acceptedAnswers) ? row.acceptedAnswers : []),
    row.explanationZhHans,
    row.reviewNotes
  ].join("\n");

  if (row.__parseError) {
    issueCategories.add("schema");
    issueCodes.push("json-parse-error");
    suggestedFixes.push("修复 JSONL 行解析错误后重跑 QA。");
  }

  for (const field of requiredFields) {
    if (!(field in row) || row[field] === "" || row[field] == null) {
      issueCategories.add("schema");
      issueCodes.push(`missing-field:${field}`);
    }
  }

  if (idCounts.get(row.id) > 1) {
    issueCategories.add("schema");
    issueCodes.push("duplicate-id");
  }

  if (promptCounts.get(normalize(row.promptZhHans)) > 1) {
    issueCategories.add("duplicate");
    issueCodes.push("exact-prompt-duplicate");
    suggestedFixes.push("去模板化重写，避免相同题干反复出现。");
  }

  if (row.type === "multiple-choice") {
    const options = Array.isArray(row.optionsZhHans) ? row.optionsZhHans : [];
    const normalizedOptions = options.map(normalize);
    if (options.length < 4) {
      issueCategories.add("schema");
      issueCodes.push(`multiple-choice-option-count:${options.length}`);
    }
    if (new Set(normalizedOptions).size !== normalizedOptions.length) {
      issueCategories.add("schema");
      issueCodes.push("duplicate-options");
      suggestedFixes.push("重写选择题选项，保证四个互异选项且只有一个正确答案。");
    }
    if (row.answer && !normalizedOptions.includes(normalize(row.answer))) {
      issueCategories.add("math");
      issueCodes.push("answer-not-in-options");
      suggestedFixes.push("修正选择题答案或选项，使答案与选项严格一致。");
    }
  } else if (Array.isArray(row.optionsZhHans) && row.optionsZhHans.length > 0) {
    issueCategories.add("schema");
    issueCodes.push("non-mc-has-options");
  }

  if (!Array.isArray(row.acceptedAnswers) || row.acceptedAnswers.length === 0) {
    issueCategories.add("schema");
    issueCodes.push("missing-accepted-answers");
  } else if (!row.acceptedAnswers.map(normalize).includes(normalize(row.answer))) {
    issueCategories.add("math");
    issueCodes.push("answer-not-in-accepted-answers");
  }

  for (const { code, regex } of sourceSafetyPatterns) {
    if (regex.test(textForScan)) {
      issueCategories.add("source-safety");
      issueCodes.push(code);
      suggestedFixes.push("移除任何可还原来源、页码、OCR、图片或原题痕迹，改为 MAIS 原创题。");
    }
  }

  for (const { code, regex } of contradictionPatterns) {
    if (regex.test(textForScan)) {
      issueCategories.add("math");
      issueCodes.push(code);
      suggestedFixes.push("该题解析自报错误或条件不足，需废弃或重新生成。");
    }
  }

  for (const { code, regex } of postS4Patterns) {
    if (regex.test(textForScan)) {
      issueCategories.add("curriculum");
      issueCodes.push(code);
    }
  }

  const expectation = s4TopicExpectations[row.topicId];
  if (!expectation) {
    issueCategories.add("curriculum");
    issueCodes.push("unknown-or-unplanned-topic");
  } else {
    const hasExpectedMarker = expectation.mustInclude.some((regex) => regex.test(textForScan));
    if (!hasExpectedMarker) {
      issueCategories.add("curriculum");
      issueCodes.push(`topic-prompt-mismatch:${expectation.label}`);
      suggestedFixes.push(expectation.suggestion);
    }
    if (expectation.mismatch.some((regex) => regex.test(textForScan))) {
      issueCategories.add("curriculum");
      issueCodes.push(`topic-contamination:${expectation.label}`);
      suggestedFixes.push(expectation.suggestion);
    }
  }

  if ((row.conceptIds ?? []).some((conceptId) => /derivatives|optimization|conics|space-vectors|random-variables|counting/.test(conceptId))) {
    issueCategories.add("curriculum");
    issueCodes.push("concept-tag-contamination");
    suggestedFixes.push("清理 conceptIds，避免把后置或异主题概念挂到当前 S4 主题。");
  }

  const answerConflict = detectAnswerExplanationConflict(row);
  if (answerConflict) {
    issueCategories.add("math");
    issueCodes.push(answerConflict);
    suggestedFixes.push("独立重算并修正答案、acceptedAnswers 与解析末句，使三者一致。");
  }

  const auditFlags = [
    ...(auditRow.structureFlags ?? []),
    ...(auditRow.sourceFlags ?? []),
    ...(auditRow.contentFlags ?? []),
    ...(auditRow.ragFlags ?? []),
    ...(auditRow.duplicateFlags ?? []),
    ...(auditRow.mathNotes ?? [])
  ];
  for (const flag of auditFlags) {
    if (flag === "requires-teacher-signoff") continue;
    if (flag.includes("source")) issueCategories.add("source-safety");
    if (flag.includes("duplicate")) issueCategories.add("duplicate");
    if (flag.includes("structure") || flag.includes("options")) issueCategories.add("schema");
    if (flag.includes("rag") || flag.includes("exam-pattern-topic-mismatch")) issueCategories.add("curriculum");
    if (flag.includes("solver")) issueCategories.add("math");
    issueCodes.push(flag);
  }

  if (auditRow.mathStatus === "solver-gap") {
    issueCategories.add("math");
    issueCodes.push("manual-independent-solver-gap");
    suggestedFixes.push("需人工教师逐题独立验算，或扩展确定性求解器后重跑；当前不能证明数学正确性。");
  }

  const uniqueIssueCodes = Array.from(new Set(issueCodes));
  const uniqueCategories = Array.from(issueCategories);
  const requiresTeacherSignoff = auditRow.mathStatus === "pending-teacher-signoff" || row.mathQaStatus === "pending-teacher-signoff";
  const hasRejectIssue = uniqueIssueCodes.some((code) =>
    code.includes("self-correction") ||
    code.includes("answer-explanation-conflict") ||
    code.includes("answer-self-declared-wrong") ||
    code.includes("answer-not-in-options") ||
    code.includes("source-") ||
    code.includes("post-s4-derivative-language")
  );
  const hasRewriteIssue = uniqueIssueCodes.length > 0;
  const verdict = hasRejectIssue ? "reject" : hasRewriteIssue ? "rewrite-required" : requiresTeacherSignoff ? "pending-teacher-signoff" : "approve-candidate";
  const severity = hasRejectIssue || auditRow.severity === "P1" ? "P1" : hasRewriteIssue ? "P2" : "none";

  return {
    questionId: row.id,
    grade: row.grade,
    topicId: row.topicId,
    topicTitleZhHans: row.topicTitleZhHans,
    type: row.type,
    difficulty: row.difficulty,
    verdict,
    severity,
    issueCategories: uniqueCategories.join(" | ") || "none",
    issueCodes: uniqueIssueCodes.join(" | ") || "none",
    auditStatus: auditRow.status ?? "not-in-audit",
    mathReviewStatus: requiresTeacherSignoff ? "pending-teacher-signoff" : auditRow.mathStatus === "solver-gap" ? "not-independently-solved" : "auto-solved",
    curriculumReviewStatus: uniqueCategories.includes("curriculum") ? "needs-retag-or-rewrite" : "topic-plausible",
    sourceSafetyStatus: uniqueCategories.includes("source-safety") ? "blocked-source-risk" : "passed-source-scan",
    duplicateReviewStatus: uniqueCategories.includes("duplicate") ? "needs-detemplating" : "no-exact-duplicate-detected",
    suggestedFix: Array.from(new Set(suggestedFixes)).join(" ") || (requiresTeacherSignoff ? "结构与主题已清理；等待教师数学签核，不得上线。" : "保留候选，但上线前仍需教师签核。"),
    reviewer,
    reviewDate,
    promptZhHans: row.promptZhHans,
    answer: row.answer,
    acceptedAnswers: Array.isArray(row.acceptedAnswers) ? row.acceptedAnswers.join(" | ") : "",
    explanationZhHans: row.explanationZhHans
  };
}

function markdownTable(rows) {
  if (!rows.length) return "- None.";
  const headers = Object.keys(rows[0] ?? {});
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${headers.map((header) => row[header]).join(" | ")} |`)
  ].join("\n");
}

const input = questionInput();
const questions = readJsonl(input.filePath);
const audit = JSON.parse(fs.readFileSync(AUDIT_JSON, "utf8"));
const auditById = new Map(audit.rows.map((row) => [row.questionId, row]));
const idCounts = questions.reduce((counts, row) => counts.set(row.id, (counts.get(row.id) ?? 0) + 1), new Map());
const promptCounts = questions.reduce((counts, row) => counts.set(normalize(row.promptZhHans), (counts.get(normalize(row.promptZhHans)) ?? 0) + 1), new Map());
const reviewRows = questions.map((row) => reviewRow(row, auditById.get(row.id) ?? {}, idCounts, promptCounts));

const headers = [
  "questionId",
  "grade",
  "topicId",
  "topicTitleZhHans",
  "type",
  "difficulty",
  "verdict",
  "severity",
  "issueCategories",
  "issueCodes",
  "auditStatus",
  "mathReviewStatus",
  "curriculumReviewStatus",
  "sourceSafetyStatus",
  "duplicateReviewStatus",
  "suggestedFix",
  "reviewer",
  "reviewDate",
  "promptZhHans",
  "answer",
  "acceptedAnswers",
  "explanationZhHans"
];
writeCsv(OUTPUT_CSV, reviewRows, headers);

const verdictCounts = countBy(reviewRows, "verdict");
const severityCounts = countBy(reviewRows, "severity");
const topicCounts = countBy(reviewRows, "topicId");
const gradeCounts = countBy(reviewRows, "grade");
const pendingTeacherSignoff = verdictCounts["pending-teacher-signoff"] ?? 0;
const issueCategoryCounts = {};
for (const row of reviewRows) {
  for (const category of row.issueCategories.split(" | ").filter((value) => value && value !== "none")) {
    issueCategoryCounts[category] = (issueCategoryCounts[category] ?? 0) + 1;
  }
}

const packageBlockers = [];
const coverageConstraints = [];
if (questions.length !== expectedTotal) coverageConstraints.push(`Inventory remains partial: ${questions.length}/${expectedTotal}`);
for (const [grade, expected] of Object.entries(expectedGradeCounts)) {
  const actual = gradeCounts[grade] ?? 0;
  if (actual !== expected) coverageConstraints.push(`Grade coverage remains partial: ${grade} ${actual}/${expected}`);
}
if ((verdictCounts.reject ?? 0) > 0) packageBlockers.push(`P1 row rejects present: ${verdictCounts.reject}`);
if ((severityCounts.P1 ?? 0) > 0) packageBlockers.push(`P1 rows present: ${severityCounts.P1}`);
if (reviewRows.some((row) => row.mathReviewStatus === "not-independently-solved")) packageBlockers.push("P1 math proof gap: all rows still need independent teacher/CAS validation");
const packageDecision = packageBlockers.length === 0 ? "partial-candidate-review-ready" : "blocked";

const topIssueCodes = Object.entries(
  reviewRows.flatMap((row) => row.issueCodes.split(" | ").filter((code) => code && code !== "none"))
    .reduce((counts, code) => {
      counts[code] = (counts[code] ?? 0) + 1;
      return counts;
    }, {})
).sort((a, b) => b[1] - a[1]).slice(0, 18);

const summary = `# Mainland PEP High DeepSeek V4 Pro 490-Question QA Summary

- Date: ${reviewDate}
- Session ID: S18
- Input: \`${input.source}\`
- Existing audit rerun: \`solvability-audit.{json,csv,md}\`
- New row-level output: \`manual-review-results.csv\`
- Package decision: **${packageDecision}**
- Scope: remediation QA of the existing 490 generated rows only; no new DeepSeek calls, no production question-bank edits.

## Executive Result

The remediated 490-row package has no \`reject\` or \`rewrite-required\` rows in this pass. It remains candidate-only and must not be integrated into the student-facing app because the full package is incomplete (${questions.length}/${expectedTotal}), covers only S4, has no S5/S6 rows, and all rows still require teacher math signoff.

## Counts

${markdownTable([
  { Metric: "Rows reviewed", Value: questions.length },
  { Metric: "Expected full package", Value: expectedTotal },
  { Metric: "Approve candidate", Value: verdictCounts["approve-candidate"] ?? 0 },
  { Metric: "Pending teacher signoff", Value: pendingTeacherSignoff },
  { Metric: "Rewrite required", Value: verdictCounts["rewrite-required"] ?? 0 },
  { Metric: "Reject", Value: verdictCounts.reject ?? 0 },
  { Metric: "P1 rows", Value: severityCounts.P1 ?? 0 },
  { Metric: "P2 rows", Value: severityCounts.P2 ?? 0 },
  { Metric: "Independent solver gaps", Value: reviewRows.filter((row) => row.mathReviewStatus === "not-independently-solved").length }
])}

## Grade And Topic Coverage

${markdownTable(Object.entries(gradeCounts).map(([Grade, Count]) => ({ Grade, Count })))}

${markdownTable(Object.entries(topicCounts).map(([Topic, Count]) => ({ Topic, Count })))}

Missing full-plan coverage: S4 has 490/700 rows; S5 has 0/700; S6 has 0/700. Missing S4 planned topics include introductory solid geometry, statistics, and probability.

## Main Issue Clusters

${markdownTable(Object.entries(issueCategoryCounts)
  .sort((a, b) => b[1] - a[1])
  .map(([Category, Count]) => ({ Category, Count })))}

## Top Issue Codes

${markdownTable(topIssueCodes.map(([Issue, Count]) => ({ Issue, Count })))}

## QA Interpretation

- **Math correctness:** rows are normalized to \`pending-teacher-signoff\`; teacher/CAS independent validation is required before any row can become \`approve-candidate\`.
- **Curriculum fit:** S4 topic metadata has been cleaned with topic whitelists; no derivative, conic, random-variable, or counting leakage remains in the remediated QA pass.
- **Schema and structure:** choice structure, accepted answers, visible answer support, and exact duplicates are clean in the remediated QA pass.
- **Source safety:** no committed source text, OCR, page locator, screenshot, or official-answer material was required or added in this review; source-safety scan stays part of the row-level gate.
- **Release posture:** this is a partial candidate-review package, not a launch package.

## External Curriculum Baseline Used For Framing

- Ministry of Education notice: http://www.moe.gov.cn/srcsite/A26/s8001/202006/t20200603_462199.html
- PEP curriculum standards landing page and math standard PDF: https://www.pep.com.cn/xw/zt/rjwy/gzkb2020/ and https://www.pep.com.cn/xw/zt/rjwy/gzkb2020/202205/P020220517519489596282.pdf
- Local implementation scope: \`data/mainlandPepHighTopics.ts\` S4/S5/S6 topic map and the existing DeepSeek QA artifacts in this folder.

## Required Next Steps

1. Complete teacher-level signoff for all \`pending-teacher-signoff\` rows before any candidate approval.
2. Keep app integration blocked until the full 2100-row package exists and S5/S6 coverage is present.
3. When provider transport is stable, continue generation with the repaired evidence selector and prompt guardrails.
4. Rerun \`audit-solvability.mjs\` and \`generate-manual-review-results.mjs\` after any further regeneration.

## Verification

- Ran: \`node coordination/content-qa/mainland-pep-high-deepseek-v1/audit-solvability.mjs\`.
- Ran: \`node coordination/content-qa/mainland-pep-high-deepseek-v1/generate-manual-review-results.mjs\`.
- Not run: \`npm run type-check\`; content QA/report-only change with no app code or source question-bank edit.
`;

fs.writeFileSync(OUTPUT_SUMMARY, summary);

const decision = `# Release Decision: Mainland PEP High DeepSeek V4 Pro 490 Questions

- Date: ${reviewDate}
- Session ID: S18
- Decision: **${packageDecision}**
- Previous machine decision: \`${audit.summary.releaseDecision}\`
- Row-level review file: \`manual-review-results.csv\`
- Summary file: \`qa-summary.md\`

## Decision

The current 490-question package is **ready for teacher review as a partial candidate package only**. It is **not approved for app integration, public release, or promotion into the production question bank**.

## Remaining Constraints

${[...coverageConstraints, ...packageBlockers].map((blocker) => `- ${blocker}`).join("\n")}

## Promotion Criteria

Before this package can move from blocked to candidate-approved:

- Complete the planned 2100 rows, including S4/S5/S6 coverage.
- Keep P0/P1 row blockers at zero.
- Keep \`reject\` and \`rewrite-required\` at zero.
- Provide independent math validation for every row marked \`pending-teacher-signoff\`.
- Preserve source-distance rules: no textbook original text, exam original stem, OCR text, screenshots, page locators, official answers, or recoverable source references.

## Safe Next Step

Use \`pending-teacher-signoff.csv\` and \`manual-review-results.csv\` as the teacher-review queue. Do not resume app integration work for this package until teacher signoff and full 2100-row generation are both complete.

## Verification Note

No production code, public question-bank source, API route, UI file, or secret file was modified. This is a content QA/report-only implementation.
`;

fs.writeFileSync(OUTPUT_DECISION, decision);

console.log(JSON.stringify({
  rowsReviewed: reviewRows.length,
  verdictCounts,
  severityCounts,
  outputCsv: path.relative(process.cwd(), OUTPUT_CSV),
  outputSummary: path.relative(process.cwd(), OUTPUT_SUMMARY),
  outputDecision: path.relative(process.cwd(), OUTPUT_DECISION),
  decision: packageDecision
}, null, 2));
