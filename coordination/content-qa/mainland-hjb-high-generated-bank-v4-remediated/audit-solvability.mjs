import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const INPUT = path.join(__dirname, "questions.jsonl");
const AUDIT_JSON = path.join(__dirname, "solvability-audit.json");
const AUDIT_CSV = path.join(__dirname, "solvability-audit.csv");
const AUDIT_MD = path.join(__dirname, "solvability-audit.md");
const MANUAL_QUEUE_CSV = path.join(__dirname, "manual-review-queue.csv");
const MANUAL_REVIEW_RESULTS_CSV = path.join(__dirname, "manual-review-results.csv");
const RELEASE_DECISION_MD = path.join(__dirname, "s18-promotability-decision.md");

const packageLabel = "Mainland HJB High Generated Bank V4 Remediated";
const priorBankJsonlPaths = [
  path.join(__dirname, "../mainland-hjb-high-generated-bank-v1/questions.jsonl"),
  path.join(__dirname, "../mainland-hjb-high-generated-bank-v2/questions.jsonl"),
  path.join(__dirname, "../mainland-hjb-high-generated-bank-v3/questions.jsonl"),
  path.join(__dirname, "../mainland-hjb-high-generated-bank-v3-remediated/questions.jsonl"),
  path.join(__dirname, "../mainland-hjb-high-generated-bank-v4/questions.jsonl")
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

function normalizeIdentity(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/[！-～]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/　/g, " ")
    .replace(/\s+/g, "")
    .replace(/−/g, "-")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/[，、；;：:。！？?!（）()【】\[\]{}“”"‘’']/g, "");
}

function normalizePromptForCrossBank(text) {
  return String(text ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, "");
}

function loadPriorPromptSet() {
  const existingPaths = priorBankJsonlPaths.filter((filePath) => fs.existsSync(filePath));
  if (!existingPaths.length) return { checked: false, total: 0, prompts: new Set() };
  const rows = existingPaths.flatMap((filePath) => readJsonl(filePath));
  return {
    checked: true,
    total: rows.length,
    prompts: new Set(rows.map((row) => normalizePromptForCrossBank(row.promptZhHans)).filter(Boolean))
  };
}

function crossBankPromptStats(rows) {
  const prior = loadPriorPromptSet();
  if (!prior.checked) return { checked: false, priorRows: 0, duplicateCount: 0, duplicateIds: [] };
  const duplicateIds = rows
    .filter((row) => prior.prompts.has(normalizePromptForCrossBank(row.promptZhHans)))
    .map((row) => row.id);
  return { checked: true, priorRows: prior.total, duplicateCount: duplicateIds.length, duplicateIds };
}

function stableHash(text) {
  let hash = 2166136261;
  for (const char of String(text)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
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

  const severityRank = { P0: 0, P1: 1, P2: 2 };
  const topSeverity = issues.length ? issues.map((issue) => issue.severity).sort((a, b) => severityRank[a] - severityRank[b])[0] : "none";
  return {
    questionId: row.id,
    grade: row.grade,
    volume: row.volume,
    chapter: row.chapter,
    type: row.type,
    difficulty: row.difficulty,
    answer: row.answer,
    acceptedAnswers: Array.isArray(row.acceptedAnswers) ? row.acceptedAnswers.join(" | ") : "",
    qaStatus: issues.length ? "needs-review" : "pass",
    severity: topSeverity,
    issueCodes: issues.map((issue) => issue.code).join(" | "),
    issueDetails: issues.map((issue) => `${issue.code}: ${issue.detail}`).join(" | "),
    recommendedAction: issues.length ? "Rewrite or manually approve before any app integration." : "Include in S18 pass-sample review before app integration."
  };
}

function selectManualSample(rows, auditRows) {
  const issueIds = new Set(auditRows.filter((row) => row.qaStatus !== "pass").map((row) => row.questionId));
  const queue = rows
    .filter((row) => issueIds.has(row.id))
    .map((row) => ({ ...row, reviewReason: "auto-issue" }));
  for (const grade of EXPECTED_GRADES) {
    const candidates = rows
      .filter((row) => row.grade === grade && !issueIds.has(row.id))
      .sort((a, b) => stableHash(`${a.id}:${a.promptZhHans}`) - stableHash(`${b.id}:${b.promptZhHans}`))
      .slice(0, 50);
    queue.push(...candidates.map((row) => ({ ...row, reviewReason: "grade-pass-sample" })));
  }
  return queue.sort((a, b) => a.grade.localeCompare(b.grade) || a.id.localeCompare(b.id));
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
  if (crossBankStats.checked && crossBankStats.duplicateCount > 0) {
    issues.push(`Cross-prior-package exact prompt duplicates: ${crossBankStats.duplicateCount}.`);
  }
  const issueRows = auditRows.filter((row) => row.qaStatus !== "pass").length;
  if (issueRows) issues.push(`Rows requiring review: ${issueRows}.`);
  return issues;
}

function buildMarkdownReport({ rows, auditRows, manualQueue, inventoryIssues, crossBankStats }) {
  const gradeCounts = countBy(rows.map((row) => row.grade));
  const typeCounts = countBy(rows.map((row) => row.type));
  const difficultyCounts = countBy(rows.map((row) => row.difficulty));
  const qaStatusCounts = countBy(auditRows.map((row) => row.qaStatus));
  const severityCounts = countBy(auditRows.map((row) => row.severity));
  const recommendation =
    inventoryIssues.length === 0
      ? "Green automated package checks: structure, source-distance wording, answer-shape, duplicate, and quota checks passed; S18 P2 remediation re-review remains required before app integration."
      : "Red: offline package is blocked until inventory or row-level issues are fixed.";

  const crossBankLine = crossBankStats.checked
    ? `Checked ${crossBankStats.priorRows} prior HJB high rows; duplicate exact prompts ${crossBankStats.duplicateCount}.`
    : "Not run because prior HJB high questions.jsonl files were not found in this workspace.";

  return `# ${packageLabel} Solvability And Answer-Shape Audit

- Date: 2026-05-24
- Session ID: S18
- Scope: 1500 offline Mainland Shanghai Education Press / HuJiaoBan high-school candidate questions
- Output type: Row-level deterministic structure/source-distance/answer-shape audit; no live LLM, OCR, external textbook corpus, or exam-paper source text

## Executive Summary

| Metric | Value |
| --- | --- |
| Expected questions | ${EXPECTED_TOTAL} |
| Actual questions | ${rows.length} |
| S4 questions | ${gradeCounts.S4 || 0} |
| S5 questions | ${gradeCounts.S5 || 0} |
| S6 questions | ${gradeCounts.S6 || 0} |
| Passing rows | ${qaStatusCounts.pass || 0} |
| Rows requiring review | ${qaStatusCounts["needs-review"] || 0} |
| P0 rows | ${severityCounts.P0 || 0} |
| P1 rows | ${severityCounts.P1 || 0} |
| P2 rows | ${severityCounts.P2 || 0} |
| Manual review queue rows | ${manualQueue.length} |
| Cross-prior-package duplicate check | ${crossBankLine} |
| Release recommendation | ${recommendation} |

## Type Counts

| Type | Count |
| --- | --- |
${EXPECTED_TYPES.map((type) => `| ${type} | ${typeCounts[type] || 0} |`).join("\n")}

## Difficulty Counts

| Difficulty | Count |
| --- | --- |
${EXPECTED_DIFFICULTIES.map((difficulty) => `| ${difficulty} | ${difficultyCounts[difficulty] || 0} |`).join("\n")}

## Inventory Issues

| Issue |
| --- |
${inventoryIssues.length ? inventoryIssues.map((issue) => `| ${issue.replace(/\|/g, "\\|")} |`).join("\n") : "| None |"}

## Manual Review Status

- Original V4 P2 rows and the remediated Challenge/Exam sweep must be manually re-reviewed before app integration.
- A 150-row structure pass sample is queued by this audit; the separate remediation queue contains the mandatory P2 recheck and targeted Challenge/Exam sweep.
- This audit does not claim full human mathematical proof of every item; it verifies deterministic packaging, source-distance wording, answer shape, duplicates, and quota readiness.

## Retest

- After any edit to \`questions.jsonl\`, rerun \`node coordination/content-qa/mainland-hjb-high-generated-bank-v4-remediated/audit-solvability.mjs\`.
- Before any future production integration, coordinate with S04/S08 and run production question-bank checks after conversion.
`;
}

function main() {
  const rows = readJsonl(INPUT);
  const auditRows = rows.map(auditRow);
  const crossBankStats = crossBankPromptStats(rows);
  const inventoryIssues = buildInventoryIssues(rows, auditRows, crossBankStats);
  const manualQueue = selectManualSample(rows, auditRows);
  const summary = {
    reportDate: "2026-05-24",
    expectedQuestions: EXPECTED_TOTAL,
    actualQuestions: rows.length,
    gradeCounts: countBy(rows.map((row) => row.grade)),
    typeCounts: countBy(rows.map((row) => row.type)),
    difficultyCounts: countBy(rows.map((row) => row.difficulty)),
    qaStatusCounts: countBy(auditRows.map((row) => row.qaStatus)),
    severityCounts: countBy(auditRows.map((row) => row.severity)),
    inventoryIssues,
    crossBankPromptCheck: crossBankStats,
    manualReviewQueueRows: manualQueue.length,
    releaseRecommendation:
      inventoryIssues.length === 0
        ? "candidate-only-auto-qa-green-pending-s18-p2-manual-re-review"
        : "blocked-pending-remediation"
  };

  fs.writeFileSync(AUDIT_JSON, `${JSON.stringify({ summary, rows: auditRows }, null, 2)}\n`);
  writeCsv(AUDIT_CSV, auditRows, [
    "questionId",
    "grade",
    "volume",
    "chapter",
    "type",
    "difficulty",
    "answer",
    "acceptedAnswers",
    "qaStatus",
    "severity",
    "issueCodes",
    "issueDetails",
    "recommendedAction"
  ]);
  writeCsv(MANUAL_QUEUE_CSV, manualQueue, [
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
  if (!fs.existsSync(MANUAL_REVIEW_RESULTS_CSV)) {
    writeCsv(MANUAL_REVIEW_RESULTS_CSV, [], [
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
  }
  fs.writeFileSync(AUDIT_MD, buildMarkdownReport({ rows, auditRows, manualQueue, inventoryIssues, crossBankStats }));
  fs.writeFileSync(
    RELEASE_DECISION_MD,
    `# S18 Promotability Decision - ${packageLabel}

- Date: 2026-05-24
- Session ID: S18
- Decision: ${summary.releaseRecommendation}
- Reason: ${inventoryIssues.length ? inventoryIssues.join(" ") : "Automated offline package checks passed after P2 remediation. Fresh S18 manual re-review of the mandatory P2 rows and targeted Challenge/Exam sample remains required before promotion."}
- App integration status: Not approved. Coordinate with S04/S08/S18 only after manual re-review passes and owner approval is explicit.
`
  );
  console.log(`Audit complete: ${summary.releaseRecommendation}; manual queue rows=${manualQueue.length}`);
  if (inventoryIssues.length) process.exitCode = 1;
}

main();
