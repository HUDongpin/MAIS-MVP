import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");

const INPUT = path.join(__dirname, "questions.jsonl");
const QUESTION_PACK = path.join(__dirname, "question-pack.json");
const AUDIT_JSON = path.join(__dirname, "solvability-audit.json");
const AUDIT_CSV = path.join(__dirname, "solvability-audit.csv");
const AUDIT_MD = path.join(__dirname, "solvability-audit.md");
const MANUAL_QUEUE_CSV = path.join(__dirname, "manual-review-queue.csv");
const MANUAL_REVIEW_RESULTS_CSV = path.join(__dirname, "manual-review-results.csv");
const RELEASE_DECISION_MD = path.join(__dirname, "s18-promotability-decision.md");

const expectedTotal = 1500;
const expectedGrades = ["P1", "P2", "P3", "P4", "P5", "P6"];
const expectedTypes = ["multiple-choice", "fill-in", "short-answer"];
const expectedDifficulties = ["Foundation", "Core", "Exam", "Challenge"];
const expectedGradeCount = 250;
const expectedTypeTotals = { "multiple-choice": 100, "fill-in": 90, "short-answer": 60 };
const expectedDifficultyTotals = {
  P1: { Foundation: 138, Core: 87, Exam: 5, Challenge: 20 },
  P2: { Foundation: 113, Core: 100, Exam: 7, Challenge: 30 },
  P3: { Foundation: 88, Core: 112, Exam: 12, Challenge: 38 },
  P4: { Foundation: 88, Core: 112, Exam: 12, Challenge: 38 },
  P5: { Foundation: 63, Core: 125, Exam: 17, Challenge: 45 },
  P6: { Foundation: 63, Core: 125, Exam: 17, Challenge: 45 }
};

const requiredFields = [
  "id",
  "batch",
  "grade",
  "semester",
  "topicId",
  "unitTitle",
  "volume",
  "conceptIds",
  "difficulty",
  "type",
  "promptZhHans",
  "optionsZhHans",
  "answer",
  "acceptedAnswers",
  "explanationZhHans",
  "evidenceCardIds",
  "assessmentPatternCardIds",
  "paperPatternCardIds",
  "sourceDistanceStatus",
  "mathQaStatus",
  "terminologyQaStatus",
  "manualQaStatus",
  "reviewNotes"
];

const forbiddenSourcePatterns = [
  { code: "source-ocr", regex: /\bOCR\b|光学字符识别|识别文本/i },
  { code: "source-screenshot", regex: /截图|截屏|扫描图|扫描件|图片来源|教材图片/ },
  { code: "source-page", regex: /第\s*\d+\s*页|页码|页[ \t]*\d+|P\.\s*\d+/i },
  { code: "source-original", regex: /原题|原卷|原教材|教材原文|课本原文|照抄|改编自|来源于|摘自/ },
  { code: "source-file", regex: /\.pdf\b|\.docx\b|\.zip\b|\.jpg\b|\.png\b|文件名|文件路径|源路径|来源路径/iu }
];

const missingVisualPatterns = [
  /如图(?:所示)?/,
  /见图/,
  /下图/,
  /上图/,
  /右图/,
  /左图/,
  /(?:^|[，。；：:\s])图中(?:可以|有|阴影|涂色|显示|给出)?/,
  /根据图(?:形|表|像)?/,
  /观察下面的图/
];

const contradictionPatterns = [
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

function loadTsExport(filePath, exportName) {
  const source = fs
    .readFileSync(filePath, "utf8")
    .replace(/^import\s+.*;\s*$/gm, "")
    .replace(/\b(const|let|var)\s+([A-Za-z_$][\w$]*)\s*:\s*[^=;]+=/g, "$1 $2 =")
    .replace(new RegExp(`export const ${exportName}(?:: [^=]+)? =`), `exports.${exportName} =`);
  const context = { exports: {} };
  vm.runInNewContext(source, context, { filename: filePath });
  return context.exports[exportName];
}

function expectedTopicCounts() {
  const cards = loadTsExport(path.join(rootDir, "data/rag/mainlandHjbPrimary.ts"), "mainlandHjbPrimaryRagCards");
  const counts = {};
  for (const grade of expectedGrades) {
    const gradeCards = cards.filter((card) => card.grade === grade);
    const base = Math.floor(expectedGradeCount / gradeCards.length);
    const remainder = expectedGradeCount % gradeCards.length;
    gradeCards.forEach((card, index) => {
      counts[card.id] = base + (index < remainder ? 1 : 0);
    });
  }
  return counts;
}

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

function atomicWrite(filePath, text) {
  const tempPath = `${filePath}.tmp-${process.pid}`;
  fs.writeFileSync(tempPath, text);
  fs.renameSync(tempPath, filePath);
}

function writeCsv(filePath, rows, headers) {
  const lines = [headers.map(csvEscape).join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))];
  atomicWrite(filePath, `${lines.join("\n")}\n`);
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
    .replace(/[，、；;：:。！？?!“”"‘’']/g, "");
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

function evidenceSets() {
  return {
    curriculum: new Set(loadTsExport(path.join(rootDir, "data/rag/mainlandHjbPrimary.ts"), "mainlandHjbPrimaryRagCards").map((card) => card.id)),
    assessment: new Set(loadTsExport(path.join(rootDir, "data/rag/mainlandHjbPrimaryAssessmentPatterns.ts"), "mainlandHjbPrimaryAssessmentPatternCards").map((card) => card.id)),
    paper: new Set()
  };
}

function auditRow(row, sets) {
  const issues = [];
  const text = sourceRiskText(row);
  if (row.__parseError) issues.push({ code: "parse-error", severity: "P0", detail: row.__parseError });
  for (const field of requiredFields) {
    if (!(field in row)) issues.push({ code: "missing-field", severity: "P1", detail: field });
  }
  if (row.batch !== "hjb-primary-v1") issues.push({ code: "bad-batch", severity: "P1", detail: row.batch });
  if (!expectedGrades.includes(row.grade)) issues.push({ code: "bad-grade", severity: "P1", detail: row.grade });
  if (!["upper", "lower"].includes(row.semester)) issues.push({ code: "bad-semester", severity: "P1", detail: row.semester });
  if (!expectedTypes.includes(row.type)) issues.push({ code: "bad-type", severity: "P1", detail: row.type });
  if (!expectedDifficulties.includes(row.difficulty)) issues.push({ code: "bad-difficulty", severity: "P1", detail: row.difficulty });
  if (!Array.isArray(row.conceptIds) || !row.conceptIds.length) issues.push({ code: "missing-concepts", severity: "P1", detail: "conceptIds" });
  if (!String(row.promptZhHans ?? "").trim()) issues.push({ code: "missing-prompt", severity: "P1", detail: "promptZhHans" });
  if (!String(row.answer ?? "").trim()) issues.push({ code: "missing-answer", severity: "P1", detail: "answer" });
  if (!Array.isArray(row.acceptedAnswers) || !row.acceptedAnswers.includes(row.answer)) issues.push({ code: "missing-accepted-answer", severity: "P1", detail: "acceptedAnswers" });
  if (!String(row.explanationZhHans ?? "").trim()) issues.push({ code: "missing-explanation", severity: "P1", detail: "explanationZhHans" });

  if (!Array.isArray(row.evidenceCardIds) || !row.evidenceCardIds.length || !row.evidenceCardIds.every((cardId) => sets.curriculum.has(cardId))) {
    issues.push({ code: "bad-curriculum-evidence", severity: "P1", detail: "evidenceCardIds" });
  }
  if (
    !Array.isArray(row.assessmentPatternCardIds) ||
    !row.assessmentPatternCardIds.length ||
    !row.assessmentPatternCardIds.every((cardId) => sets.assessment.has(cardId)) ||
    !Array.isArray(row.paperPatternCardIds) ||
    !row.paperPatternCardIds.every((cardId) => sets.paper.has(cardId))
  ) {
    issues.push({ code: "bad-hjb-primary-pattern-evidence", severity: "P1", detail: "assessmentPatternCardIds/paperPatternCardIds" });
  }

  if (row.type === "multiple-choice") {
    const options = Array.isArray(row.optionsZhHans) ? row.optionsZhHans : [];
    if (options.length !== 4) issues.push({ code: "bad-mc-options", severity: "P1", detail: `options length ${options.length}` });
    if (new Set(options.map(normalizeIdentity)).size !== options.length) issues.push({ code: "duplicate-mc-options", severity: "P1", detail: "duplicate options" });
    if (!options.includes(row.answer)) issues.push({ code: "answer-not-option", severity: "P1", detail: row.answer });
  } else if (Array.isArray(row.optionsZhHans) && row.optionsZhHans.length) {
    issues.push({ code: "non-mc-has-options", severity: "P1", detail: row.type });
  }

  for (const { code, regex } of forbiddenSourcePatterns) {
    if (regex.test(text)) issues.push({ code, severity: "P0", detail: "source/reference wording detected" });
  }
  for (const regex of missingVisualPatterns) {
    if (regex.test(text)) issues.push({ code: "missing-visual-reference", severity: "P1", detail: "visual reference without diagramSpec" });
  }
  for (const regex of contradictionPatterns) {
    if (regex.test(text)) issues.push({ code: "self-contradiction-wording", severity: "P1", detail: "contradiction wording detected" });
  }
  if (row.sourceDistanceStatus !== "passed-auto-source-scan") {
    issues.push({ code: "source-distance-not-passed", severity: "P1", detail: row.sourceDistanceStatus });
  }

  const severityRank = { P0: 0, P1: 1, P2: 2 };
  const topSeverity = issues.length ? issues.map((issue) => issue.severity).sort((left, right) => severityRank[left] - severityRank[right])[0] : "none";
  return {
    questionId: row.id,
    grade: row.grade,
    semester: row.semester,
    topicId: row.topicId,
    unitTitle: row.unitTitle,
    type: row.type,
    difficulty: row.difficulty,
    answer: row.answer,
    acceptedAnswers: Array.isArray(row.acceptedAnswers) ? row.acceptedAnswers.join(" | ") : "",
    qaStatus: issues.length ? "needs-review" : "pass",
    severity: topSeverity,
    issueCodes: issues.map((issue) => issue.code).join(" | "),
    issueDetails: issues.map((issue) => `${issue.code}: ${issue.detail}`).join(" | "),
    recommendedAction: issues.length ? "Rewrite or manually review before any future integration decision." : "Passed structural gate; include in S18 pass-sample review."
  };
}

function selectManualSample(rows, auditRows) {
  const issueIds = new Set(auditRows.filter((row) => row.qaStatus !== "pass").map((row) => row.questionId));
  const queue = rows
    .filter((row) => issueIds.has(row.id))
    .map((row) => ({ ...row, reviewReason: "auto-issue" }));
  for (const grade of expectedGrades) {
    const candidates = rows
      .filter((row) => row.grade === grade && !issueIds.has(row.id))
      .sort((left, right) => stableHash(`${left.id}:${left.promptZhHans}`) - stableHash(`${right.id}:${right.promptZhHans}`))
      .slice(0, 50);
    queue.push(...candidates.map((row) => ({ ...row, reviewReason: "grade-pass-sample" })));
  }
  return queue.sort((left, right) => left.grade.localeCompare(right.grade) || left.id.localeCompare(right.id));
}

function buildInventoryIssues(rows, auditRows) {
  const issues = [];
  const topicExpectedCounts = expectedTopicCounts();
  const gradeCounts = countBy(rows.map((row) => row.grade));
  const typeCounts = countBy(rows.map((row) => `${row.grade}:${row.type}`));
  const difficultyCounts = countBy(rows.map((row) => `${row.grade}:${row.difficulty}`));
  const topicCounts = countBy(rows.map((row) => row.topicId));
  const idCounts = countBy(rows.map((row) => row.id));
  const promptCounts = countBy(rows.map((row) => normalizeIdentity(row.promptZhHans)));
  if (rows.length !== expectedTotal) issues.push(`Expected ${expectedTotal} questions; found ${rows.length}.`);
  for (const grade of expectedGrades) {
    if ((gradeCounts[grade] || 0) !== expectedGradeCount) issues.push(`Expected ${grade} to have ${expectedGradeCount}; found ${gradeCounts[grade] || 0}.`);
    for (const type of expectedTypes) {
      const key = `${grade}:${type}`;
      if ((typeCounts[key] || 0) !== expectedTypeTotals[type]) issues.push(`Expected ${grade} ${type} ${expectedTypeTotals[type]}; found ${typeCounts[key] || 0}.`);
    }
    for (const difficulty of expectedDifficulties) {
      const key = `${grade}:${difficulty}`;
      if ((difficultyCounts[key] || 0) !== expectedDifficultyTotals[grade][difficulty]) {
        issues.push(`Expected ${grade} ${difficulty} ${expectedDifficultyTotals[grade][difficulty]}; found ${difficultyCounts[key] || 0}.`);
      }
    }
  }
  for (const [topicId, expectedCount] of Object.entries(topicExpectedCounts)) {
    if ((topicCounts[topicId] || 0) !== expectedCount) issues.push(`Expected ${topicId} ${expectedCount}; found ${topicCounts[topicId] || 0}.`);
  }
  const duplicateIds = Object.entries(idCounts).filter(([, count]) => count > 1);
  const duplicatePrompts = Object.entries(promptCounts).filter(([key, count]) => key && count > 1);
  if (duplicateIds.length) issues.push(`Duplicate IDs: ${duplicateIds.map(([id]) => id).join(", ")}.`);
  if (duplicatePrompts.length) issues.push(`Duplicate exact prompts: ${duplicatePrompts.length}.`);
  const issueRows = auditRows.filter((row) => row.qaStatus !== "pass").length;
  if (issueRows) issues.push(`Rows requiring review: ${issueRows}.`);
  return issues;
}

function candidateRows(rows) {
  return rows.map((row) => ({
    ...row,
    sourceDistanceStatus: "passed-auto-source-scan",
    mathQaStatus: "pending-s18-review",
    terminologyQaStatus: "pending-s18-review",
    manualQaStatus: "pending-s18-review",
    reviewNotes: "S18 HJB primary V1 automated source-distance/structure gate passed with 300-row grade sample queue generated; candidate QA package only, not approved for public integration."
  }));
}

function buildMarkdownReport({ rows, auditRows, manualQueue, inventoryIssues, approved }) {
  const gradeCounts = countBy(rows.map((row) => row.grade));
  const typeCounts = countBy(rows.map((row) => row.type));
  const difficultyCounts = countBy(rows.map((row) => row.difficulty));
  const statusCounts = countBy(auditRows.map((row) => row.qaStatus));
  const issueRows = auditRows.filter((row) => row.qaStatus !== "pass");
  const table = (headers, bodyRows) => [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...bodyRows.map((row) => `| ${row.map((value) => String(value ?? "").replace(/\|/g, "\\|")).join(" | ")} |`)
  ].join("\n");

  return [
    "# S18 Mainland HJB Primary Generated Bank V1 Candidate Solvability Audit",
    "",
    "- Date: 2026-05-25",
    "- Session ID: S18",
    "- Scope: Mainland Shanghai Education Press / HuJiaoBan P1-P6 generated question bank",
    `- Result: ${approved ? "candidate-qa-green" : "blocked"}`,
    `- Total questions: ${rows.length}`,
    `- Pass rows: ${statusCounts.pass ?? 0}`,
    `- Failing rows: ${issueRows.length}`,
    `- Duplicate IDs / prompts: ${inventoryIssues.some((issue) => issue.startsWith("Duplicate")) ? "see inventory issues" : "0 / 0"}`,
    `- Manual review queue: ${manualQueue.length} rows`,
    "",
    "## Grade Counts",
    "",
    table(["grade", "count"], Object.entries(gradeCounts)),
    "",
    "## Type Counts",
    "",
    table(["type", "count"], Object.entries(typeCounts)),
    "",
    "## Difficulty Counts",
    "",
    table(["difficulty", "count"], Object.entries(difficultyCounts)),
    "",
    "## Inventory Issues",
    "",
    inventoryIssues.length ? inventoryIssues.map((issue) => `- ${issue}`).join("\n") : "- None",
    "",
    "## Assumptions",
    "",
    "- This audit validates generated JSONL/CSV/JSON as a candidate QA package only.",
    "- DeepSeek-generated free-form math is checked structurally here; the 300-row queue records the required S18 pass-sample review set.",
    "- The generated content uses committed safe-RAG cards only; no OCR, textbook body text, paper prompt text, source image, or source locator is used by this audit.",
    "- This task does not approve production integration. A later owner-authorized S04/S08/S18 integration task must make that decision separately."
  ].join("\n");
}

function writeReleaseDecision({ approved, manualQueue, inventoryIssues, auditRows }) {
  const issueRows = auditRows.filter((row) => row.qaStatus !== "pass");
  const text = approved
    ? `# S18 Promotability Decision - Mainland HJB Primary Generated Bank V1 Candidate

- Date: 2026-05-25
- Session ID: S18
- Decision: candidate-qa-green-not-approved-for-public-integration
- Generated rows: ${expectedTotal}
- Manual/semi-manual queue: ${manualQueue.length} rows, including 50-row grade sample per P1/P2/P3/P4/P5/P6 and 100% of auto-issue rows.
- Auto issue rows: ${issueRows.length}
- Release threshold: 0 P0/P1 structural/source-distance blockers, 0 duplicate IDs, 0 duplicate exact prompts, valid RAG evidence IDs, valid option/answer structure.
- Reason: Automated offline candidate-package checks passed and the required S18 sample queue was generated with no auto red flags.
- App integration status: Not approved. Do not connect this package to \`data/questions.ts\`, App UI, API, lesson practice, or production data until a later owner-authorized integration task approves it.
`
    : `# S18 Promotability Decision - Mainland HJB Primary Generated Bank V1 Candidate

- Date: 2026-05-25
- Session ID: S18
- Decision: blocked
- Generated rows: ${auditRows.length}
- Auto issue rows: ${issueRows.length}
- Inventory issues: ${inventoryIssues.length}
- App integration status: Blocked; do not import into \`data/questions.ts\` or \`data/topics.ts\`.
- Required next step: rewrite failing rows or regenerate affected batches, then rerun \`node coordination/content-qa/mainland-hjb-primary-generated-bank-v1-1500/audit-solvability.mjs\`.
`;
  atomicWrite(RELEASE_DECISION_MD, text);
}

function main() {
  const rows = readJsonl(INPUT);
  const sets = evidenceSets();
  const auditRows = rows.map((row) => auditRow(row, sets));
  const manualQueue = selectManualSample(rows, auditRows);
  const inventoryIssues = buildInventoryIssues(rows, auditRows);
  const approved = inventoryIssues.length === 0 && auditRows.every((row) => row.qaStatus === "pass");
  const outputRows = approved ? candidateRows(rows) : rows;

  atomicWrite(AUDIT_JSON, `${JSON.stringify({ approved, inventoryIssues, rows: auditRows }, null, 2)}\n`);
  writeCsv(AUDIT_CSV, auditRows, ["questionId", "grade", "semester", "topicId", "unitTitle", "type", "difficulty", "answer", "acceptedAnswers", "qaStatus", "severity", "issueCodes", "issueDetails", "recommendedAction"]);
  writeCsv(MANUAL_QUEUE_CSV, manualQueue, ["id", "grade", "semester", "topicId", "unitTitle", "type", "difficulty", "promptZhHans", "optionsZhHans", "answer", "acceptedAnswers", "explanationZhHans", "reviewReason"]);
  writeCsv(
    MANUAL_REVIEW_RESULTS_CSV,
    manualQueue.map((row) => ({
      ...row,
      reviewStatus: approved ? "pending-s18-manual-review" : "pending-remediation",
      reviewer: "S18",
      reviewNotes: approved ? "Auto gates passed; manual sample review is still pending and this package is not approved for public integration." : "Blocked until inventory and row issues clear."
    })),
    ["id", "grade", "semester", "topicId", "unitTitle", "type", "difficulty", "reviewReason", "reviewStatus", "reviewer", "reviewNotes"]
  );
  atomicWrite(AUDIT_MD, `${buildMarkdownReport({ rows, auditRows, manualQueue, inventoryIssues, approved })}\n`);
  atomicWrite(QUESTION_PACK, `${JSON.stringify({ questions: outputRows }, null, 2)}\n`);
  writeReleaseDecision({ approved, manualQueue, inventoryIssues, auditRows });

  if (!approved) {
    console.error(`Audit blocked: ${inventoryIssues.length} inventory issues, ${auditRows.filter((row) => row.qaStatus !== "pass").length} row issues.`);
    process.exitCode = 1;
    return;
  }
  console.log(`Audit passed: ${rows.length} rows, manual queue ${manualQueue.length}, question-pack promoted.`);
}

main();
