import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const INPUT = path.join(__dirname, "questions.jsonl");
const SOLVABILITY_JSON = path.join(__dirname, "solvability-audit.json");
const AUDIT_JSON = path.join(__dirname, "quality-audit.json");
const AUDIT_CSV = path.join(__dirname, "quality-audit.csv");
const AUDIT_MD = path.join(__dirname, "quality-audit.md");
const FAILING_ROWS_CSV = path.join(__dirname, "quality-failing-rows.csv");
const MANUAL_QUEUE_CSV = path.join(__dirname, "quality-manual-review-queue.csv");
const RELEASE_DECISION_MD = path.join(__dirname, "s18-promotability-decision.md");

const packageLabel = "Mainland HJB High Generated Bank V3";
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

const SOURCE_RISK_PATTERNS = [
  { code: "source-ocr", severity: "P0", regex: /\bOCR\b|光学字符识别|识别文本/i },
  { code: "source-screenshot", severity: "P0", regex: /截图|截屏|扫描图|扫描件|图片来源|教材图片/ },
  { code: "source-page", severity: "P0", regex: /第\s*\d+\s*页|页码|页\s*\d+|P\.\s*\d+/i },
  { code: "source-original", severity: "P0", regex: /原题|原卷|原教材|教材原文|课本原文|照抄|改编自|来源于|摘自/ },
  { code: "source-file", severity: "P0", regex: /\.pdf\b|\.docx\b|\.zip\b|\.jpg\b|\.png\b|文件名|路径/iu },
  { code: "missing-visual-reference", severity: "P1", regex: /如图(?:所示)?|下图|上图|右图|左图|图中|根据图(?:形|表|像)?|观察下面的图/ },
  { code: "self-contradiction-wording", severity: "P1", regex: /选项中没有|题目有误|无法确定|答案不唯一|不够条件|缺少图|缺少信息|重新计算|没有正确答案/ }
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

function stableHash(text) {
  let hash = 2166136261;
  for (const char of String(text)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
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

function sourceRiskText(row) {
  return [row.promptZhHans, ...(row.optionsZhHans ?? []), row.answer, ...(row.acceptedAnswers ?? []), row.explanationZhHans].join("\n");
}

function issue(severity, code, detail) {
  return { severity, code, detail };
}

function auditRow(row) {
  const issues = [];
  const text = sourceRiskText(row);
  if (row.__parseError) issues.push(issue("P0", "parse-error", row.__parseError));
  for (const field of REQUIRED_FIELDS) {
    if (!(field in row)) issues.push(issue("P1", "missing-field", field));
  }
  if (!/^hjb-high-ds-v3-s[456]-\d{3}$/.test(row.id ?? "")) issues.push(issue("P1", "bad-v3-id", row.id));
  if (!String(row.promptZhHans ?? "").startsWith("V3安全变式")) issues.push(issue("P1", "missing-v3-prompt-prefix", row.promptZhHans));
  if (!EXPECTED_GRADES.includes(row.grade)) issues.push(issue("P1", "bad-grade", row.grade));
  if (!EXPECTED_TYPES.includes(row.type)) issues.push(issue("P1", "bad-type", row.type));
  if (!EXPECTED_DIFFICULTIES.includes(row.difficulty)) issues.push(issue("P1", "bad-difficulty", row.difficulty));
  if (!Array.isArray(row.conceptIds) || row.conceptIds.length === 0) issues.push(issue("P1", "missing-concepts", "conceptIds"));
  if (!Array.isArray(row.evidenceCardIds) || row.evidenceCardIds.length === 0) issues.push(issue("P1", "missing-textbook-evidence", "evidenceCardIds"));
  if (!Array.isArray(row.examPatternCardIds) || row.examPatternCardIds.length === 0) issues.push(issue("P1", "missing-pattern-evidence", "examPatternCardIds"));
  if (!String(row.promptZhHans ?? "").trim()) issues.push(issue("P1", "missing-prompt", "promptZhHans"));
  if (!String(row.answer ?? "").trim()) issues.push(issue("P1", "missing-answer", "answer"));
  if (!String(row.explanationZhHans ?? "").trim()) issues.push(issue("P1", "missing-explanation", "explanationZhHans"));
  if (String(row.explanationZhHans ?? "").length < 12) issues.push(issue("P2", "thin-explanation", "explanation shorter than 12 chars"));

  if (row.type === "multiple-choice") {
    const options = Array.isArray(row.optionsZhHans) ? row.optionsZhHans : [];
    if (options.length !== 4) issues.push(issue("P1", "bad-mc-options", `options length ${options.length}`));
    if (new Set(options.map(normalizeIdentity)).size !== options.length) issues.push(issue("P1", "duplicate-mc-options", "duplicate options"));
    if (!options.includes(row.answer)) issues.push(issue("P1", "answer-not-option", row.answer));
  } else if (Array.isArray(row.optionsZhHans) && row.optionsZhHans.length) {
    issues.push(issue("P1", "non-mc-has-options", row.type));
  }

  for (const pattern of SOURCE_RISK_PATTERNS) {
    if (pattern.regex.test(text)) issues.push(issue(pattern.severity, pattern.code, "risk wording detected"));
  }
  if (row.sourceDistanceStatus !== "passed-auto-source-scan") issues.push(issue("P1", "source-distance-not-passed", row.sourceDistanceStatus));
  if (row.mathQaStatus !== "pending-manual") issues.push(issue("P1", "math-qa-not-pending", row.mathQaStatus));
  if (row.terminologyQaStatus !== "pending-manual") issues.push(issue("P1", "terminology-qa-not-pending", row.terminologyQaStatus));
  if (/approved|green-approved-for-integration|publish|production/i.test(String(row.reviewNotes ?? ""))) {
    issues.push(issue("P1", "review-note-implies-approval", row.reviewNotes));
  }

  const severityRank = { P0: 0, P1: 1, P2: 2 };
  const topSeverity = issues.length ? issues.map((entry) => entry.severity).sort((a, b) => severityRank[a] - severityRank[b])[0] : "none";
  return {
    questionId: row.id,
    grade: row.grade,
    topicId: row.topicId,
    chapter: row.chapter,
    type: row.type,
    difficulty: row.difficulty,
    qaStatus: issues.some((entry) => entry.severity === "P0" || entry.severity === "P1") ? "blocked" : issues.length ? "manual-review" : "pass",
    severity: topSeverity,
    issueCodes: issues.map((entry) => entry.code).join(" | "),
    issueDetails: issues.map((entry) => `${entry.code}: ${entry.detail}`).join(" | "),
    recommendedAction: issues.length ? "Review before integration planning." : "Include in pass-sample manual review before integration planning."
  };
}

function buildInventory(rows, auditRows) {
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
  if (auditRows.some((row) => row.qaStatus === "blocked")) {
    issues.push(`Quality blocked rows: ${auditRows.filter((row) => row.qaStatus === "blocked").length}.`);
  }
  return { issues, gradeCounts, typeCounts, difficultyCounts, duplicateIds, duplicatePrompts };
}

function readSolvabilitySummary() {
  if (!fs.existsSync(SOLVABILITY_JSON)) return null;
  return JSON.parse(fs.readFileSync(SOLVABILITY_JSON, "utf8")).summary;
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
  rows.filter((row) => issueIds.has(row.id)).forEach((row) => add(row, "quality-issue"));
  for (const grade of EXPECTED_GRADES) {
    rows
      .filter((row) => row.grade === grade && !issueIds.has(row.id))
      .sort((a, b) => stableHash(`${a.id}:${a.promptZhHans}`) - stableHash(`${b.id}:${b.promptZhHans}`))
      .slice(0, 50)
      .forEach((row) => add(row, "grade-pass-sample"));
  }
  for (const type of EXPECTED_TYPES) {
    const row = rows.find((candidate) => candidate.type === type);
    if (row) add(row, "type-anchor");
  }
  for (const difficulty of EXPECTED_DIFFICULTIES) {
    const row = rows.find((candidate) => candidate.difficulty === difficulty);
    if (row) add(row, "difficulty-anchor");
  }
  return Array.from(queueById.values()).sort((a, b) => a.grade.localeCompare(b.grade) || a.questionId.localeCompare(b.questionId));
}

function buildMarkdownReport({ rows, auditRows, inventory, solvabilitySummary, manualQueue }) {
  const p0 = auditRows.filter((row) => row.severity === "P0").length;
  const p1 = auditRows.filter((row) => row.severity === "P1").length;
  const p2 = auditRows.filter((row) => row.severity === "P2").length;
  return [
    `# ${packageLabel} Quality Audit`,
    "",
    `- Date: ${new Date().toISOString().slice(0, 10)}`,
    "- Session ID: S18",
    `- Total rows: ${rows.length}`,
    `- P0 rows: ${p0}`,
    `- P1 rows: ${p1}`,
    `- P2 rows: ${p2}`,
    `- Inventory issues: ${inventory.issues.length}`,
    `- Solvability P0 rows: ${solvabilitySummary?.p0Rows ?? "not-run"}`,
    `- Solvability P1 rows: ${solvabilitySummary?.p1Rows ?? "not-run"}`,
    `- Manual review queue rows: ${manualQueue.length}`,
    "",
    "## Verdict",
    "",
    p0 || p1 || inventory.issues.length || (solvabilitySummary && (solvabilitySummary.p0Rows || solvabilitySummary.p1Rows || solvabilitySummary.inventoryIssues?.length))
      ? "Blocked for app integration. Keep candidate-only and remediate or manually approve flagged rows."
      : "Auto quality gates passed with 0 P0/P1. Candidate remains pending S18 manual review and owner approval before any production integration.",
    "",
    "## Inventory Issues",
    "",
    ...(inventory.issues.length ? inventory.issues.map((entry) => `- ${entry}`) : ["- None"]),
    "",
    "## Quality Policy",
    "",
    "- Rows intentionally remain `pending-manual` for math and terminology QA.",
    "- This audit does not approve publication or production integration.",
    "- Manual review must inspect mathematical depth, wording naturalness, and topic fit before promotion."
  ].join("\n");
}

function writeReleaseDecision({ inventory, auditRows, solvabilitySummary }) {
  const p0 = auditRows.filter((row) => row.severity === "P0").length;
  const p1 = auditRows.filter((row) => row.severity === "P1").length;
  const solvabilityBlocked =
    !solvabilitySummary || solvabilitySummary.p0Rows || solvabilitySummary.p1Rows || (solvabilitySummary.inventoryIssues ?? []).length;
  const blocked = p0 || p1 || inventory.issues.length || solvabilityBlocked;
  const decision = blocked ? "blocked-auto-quality-or-solvability-issues" : "candidate-only-auto-qa-green-pending-s18-manual-review";
  const reason = blocked
    ? `Automated checks found quality P0=${p0}, quality P1=${p1}, quality inventory=${inventory.issues.length}, solvabilityBlocked=${Boolean(solvabilityBlocked)}.`
    : "Automated quality, source-distance, schema, count, duplicate, and solvability gates passed with 0 P0/P1; manual S18 review remains required.";
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
  const rows = readJsonl(INPUT);
  const auditRows = rows.map(auditRow);
  const inventory = buildInventory(rows, auditRows);
  const solvabilitySummary = readSolvabilitySummary();
  const manualQueue = selectManualQueue(rows, auditRows);
  const failingRows = auditRows.filter((row) => row.qaStatus !== "pass");
  const payload = {
    packageLabel,
    generatedAt: new Date().toISOString(),
    summary: {
      totalRows: rows.length,
      p0Rows: auditRows.filter((row) => row.severity === "P0").length,
      p1Rows: auditRows.filter((row) => row.severity === "P1").length,
      p2Rows: auditRows.filter((row) => row.severity === "P2").length,
      blockedRows: auditRows.filter((row) => row.qaStatus === "blocked").length,
      manualReviewRows: auditRows.filter((row) => row.qaStatus === "manual-review").length,
      passRows: auditRows.filter((row) => row.qaStatus === "pass").length,
      inventoryIssues: inventory.issues,
      solvabilitySummary,
      manualQueueRows: manualQueue.length
    },
    rows: auditRows
  };
  fs.writeFileSync(AUDIT_JSON, `${JSON.stringify(payload, null, 2)}\n`);
  writeCsv(AUDIT_CSV, auditRows, [
    "questionId",
    "grade",
    "topicId",
    "chapter",
    "type",
    "difficulty",
    "qaStatus",
    "severity",
    "issueCodes",
    "issueDetails",
    "recommendedAction"
  ]);
  writeCsv(FAILING_ROWS_CSV, failingRows, [
    "questionId",
    "grade",
    "topicId",
    "chapter",
    "type",
    "difficulty",
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
  fs.writeFileSync(AUDIT_MD, `${buildMarkdownReport({ rows, auditRows, inventory, solvabilitySummary, manualQueue })}\n`);
  writeReleaseDecision({ inventory, auditRows, solvabilitySummary });

  const blocked = payload.summary.p0Rows || payload.summary.p1Rows || inventory.issues.length || !solvabilitySummary || solvabilitySummary.p0Rows || solvabilitySummary.p1Rows || (solvabilitySummary.inventoryIssues ?? []).length;
  if (blocked) {
    console.error(`${packageLabel}: quality audit blocked with P0=${payload.summary.p0Rows}, P1=${payload.summary.p1Rows}, inventory=${inventory.issues.length}`);
    process.exitCode = 1;
  } else {
    console.log(`${packageLabel}: quality audit passed for ${rows.length} rows; manual queue ${manualQueue.length}`);
  }
}

main();
