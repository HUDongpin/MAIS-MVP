import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const INPUT = path.join(__dirname, "questions.jsonl");
const AUDIT_JSON = path.join(__dirname, "solvability-audit.json");
const AUDIT_CSV = path.join(__dirname, "solvability-audit.csv");
const AUDIT_MD = path.join(__dirname, "solvability-audit.md");
const MANUAL_QUEUE_CSV = path.join(__dirname, "manual-review-queue.csv");
const REMEDIATION_QUEUE_CSV = path.join(__dirname, "remediation-queue.csv");
const MANUAL_REVIEW_RESULTS_CSV = path.join(__dirname, "manual-review-results.csv");
const RELEASE_DECISION_MD = path.join(__dirname, "s18-promotability-decision.md");

const packageLabel = "Mainland BNU High Generated Bank V1";
const EXPECTED_TOTAL = 1500;
const EXPECTED_GRADES = ["S4", "S5", "S6"];
const EXPECTED_TYPES = ["multiple-choice", "fill-in", "short-answer"];
const EXPECTED_DIFFICULTIES = ["Foundation", "Core", "Exam", "Challenge"];
const EXPECTED_GRADE_COUNT = 500;
const EXPECTED_TYPE_TOTALS = { "multiple-choice": 175, "fill-in": 150, "short-answer": 175 };
const EXPECTED_DIFFICULTY_TOTALS = {
  S4: { Foundation: 150, Core: 230, Exam: 90, Challenge: 30 },
  S5: { Foundation: 90, Core: 230, Exam: 130, Challenge: 50 },
  S6: { Foundation: 50, Core: 180, Exam: 190, Challenge: 80 }
};

const REQUIRED_FIELDS = [
  "id",
  "batch",
  "grade",
  "semester",
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
  "assessmentPatternCardIds",
  "sourceDistanceStatus",
  "mathQaStatus",
  "terminologyQaStatus",
  "manualQaStatus",
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
    .normalize("NFKC")
    .replace(/\s+/g, "")
    .replace(/−/g, "-")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/[，、；;：:。！？?!（）()【】\[\]{}“”"‘’']/g, "");
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
  if (!Array.isArray(row.assessmentPatternCardIds) || !row.assessmentPatternCardIds.length) {
    issues.push({ code: "missing-evidence", severity: "P1", detail: "assessmentPatternCardIds" });
  }
  if (!String(row.promptZhHans ?? "").trim()) issues.push({ code: "missing-prompt", severity: "P1", detail: "promptZhHans" });
  if (!String(row.answer ?? "").trim()) issues.push({ code: "missing-answer", severity: "P1", detail: "answer" });
  if (!Array.isArray(row.acceptedAnswers) || !row.acceptedAnswers.length) issues.push({ code: "missing-accepted-answers", severity: "P1", detail: "acceptedAnswers" });
  if (!String(row.explanationZhHans ?? "").trim()) issues.push({ code: "missing-explanation", severity: "P1", detail: "explanationZhHans" });
  if (String(row.explanationZhHans ?? "").length > 220) issues.push({ code: "long-explanation", severity: "P2", detail: `${String(row.explanationZhHans).length} chars` });

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
    if (regex.test(text)) issues.push({ code: "missing-visual-reference", severity: "P1", detail: "visual reference without textual description" });
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
  const queuedIds = new Set(queue.map((row) => row.id));

  for (const grade of EXPECTED_GRADES) {
    const passRows = rows
      .filter((row) => row.grade === grade && !issueIds.has(row.id))
      .sort((a, b) => stableHash(`${a.id}:${a.promptZhHans}`) - stableHash(`${b.id}:${b.promptZhHans}`));
    const selected = [];
    for (const type of EXPECTED_TYPES) {
      selected.push(...passRows.filter((row) => row.type === type).slice(0, 3));
    }
    for (const chapter of Array.from(new Set(passRows.map((row) => row.chapter)))) {
      const candidate = passRows.find((row) => row.chapter === chapter);
      if (candidate) selected.push(candidate);
    }
    selected.push(...passRows);
    for (const row of selected) {
      if (queuedIds.has(row.id)) continue;
      queue.push({ ...row, reviewReason: "grade-type-chapter-pass-sample" });
      queuedIds.add(row.id);
      const gradeSampleCount = queue.filter((queued) => queued.grade === grade && queued.reviewReason !== "auto-issue").length;
      if (gradeSampleCount >= 30) break;
    }
  }
  return queue.sort((left, right) => left.grade.localeCompare(right.grade) || left.id.localeCompare(right.id));
}

function buildInventoryIssues(rows, auditRows) {
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
      if ((difficultyCounts[key] || 0) !== EXPECTED_DIFFICULTY_TOTALS[grade][difficulty]) {
        issues.push(`Expected ${grade} ${difficulty} ${EXPECTED_DIFFICULTY_TOTALS[grade][difficulty]}; found ${difficultyCounts[key] || 0}.`);
      }
    }
  }
  const duplicateIds = Object.entries(idCounts).filter(([, count]) => count > 1);
  if (duplicateIds.length) issues.push(`Duplicate IDs: ${duplicateIds.map(([id]) => id).join(", ")}.`);
  const duplicatePrompts = Object.entries(promptCounts).filter(([prompt, count]) => prompt && count > 1);
  if (duplicatePrompts.length) issues.push(`Duplicate exact normalized prompts: ${duplicatePrompts.length}.`);
  const blockingRows = auditRows.filter((row) => row.severity === "P0" || row.severity === "P1");
  if (blockingRows.length) issues.push(`Blocking P0/P1 row issues: ${blockingRows.length}.`);
  return issues;
}

function buildMarkdown({ rows, auditRows, inventoryIssues, manualQueue }) {
  const gradeCounts = countBy(rows.map((row) => row.grade));
  const typeCounts = countBy(rows.map((row) => `${row.grade}:${row.type}`));
  const difficultyCounts = countBy(rows.map((row) => `${row.grade}:${row.difficulty}`));
  const issueCounts = countBy(auditRows.flatMap((row) => (row.issueCodes ? row.issueCodes.split(" | ") : [])).filter(Boolean));
  const passCount = auditRows.filter((row) => row.qaStatus === "pass").length;
  const blockingCount = auditRows.filter((row) => row.severity === "P0" || row.severity === "P1").length;
  const verdict = inventoryIssues.length ? "Needs remediation or manual sign-off before any app integration." : "Auto solvability/source-distance structure gate passed; still candidate-only until manual S18 sampling is complete.";
  return `# ${packageLabel} Solvability Audit

- Date: 2026-05-27
- Session ID: S18
- Input: \`questions.jsonl\`
- Verdict: ${verdict}

## Summary

- Total rows: ${rows.length} / ${EXPECTED_TOTAL}
- Pass rows: ${passCount}
- Blocking P0/P1 rows: ${blockingCount}
- Manual review queue rows: ${manualQueue.length}
- Inventory issues: ${inventoryIssues.length ? inventoryIssues.length : "none"}

## Grade Counts

${EXPECTED_GRADES.map((grade) => `- ${grade}: ${gradeCounts[grade] ?? 0} / ${EXPECTED_GRADE_COUNT}`).join("\n")}

## Type Quotas

${EXPECTED_GRADES.flatMap((grade) => EXPECTED_TYPES.map((type) => `- ${grade} ${type}: ${typeCounts[`${grade}:${type}`] ?? 0} / ${EXPECTED_TYPE_TOTALS[type]}`)).join("\n")}

## Difficulty Quotas

${EXPECTED_GRADES.flatMap((grade) => EXPECTED_DIFFICULTIES.map((difficulty) => `- ${grade} ${difficulty}: ${difficultyCounts[`${grade}:${difficulty}`] ?? 0} / ${EXPECTED_DIFFICULTY_TOTALS[grade][difficulty]}`)).join("\n")}

## Issue Counts

${Object.keys(issueCounts).length ? Object.entries(issueCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([code, count]) => `- ${code}: ${count}`).join("\n") : "- none"}

## Inventory Issues

${inventoryIssues.length ? inventoryIssues.map((issue) => `- ${issue}`).join("\n") : "- none"}

## Candidate Boundary

- This audit does not promote the package into product data.
- Questions remain candidate-only until S18 manual review results are recorded.
- Any app integration must be separately coordinated with S04/S18 and must run the project question-bank checks.
`;
}

function buildReleaseDecision({ inventoryIssues, manualQueue }) {
  const autoPassed = inventoryIssues.length === 0;
  return `# ${packageLabel} S18 Promotability Decision

- Date: 2026-05-27
- Session ID: S18
- Auto audit status: ${autoPassed ? "Passed structure/source-distance gate" : "Needs remediation"}
- Manual review status: Pending
- Decision: Not approved for product integration yet

## Rationale

- Candidate package requires S18 manual sampling before promotion.
- Manual review queue rows: ${manualQueue.length}
- Blocking inventory issues: ${inventoryIssues.length}

## Next Gate

Record manual QA in \`manual-review-results.csv\`, remediate rejected rows, rerun \`audit-solvability.mjs\`, and coordinate with S04 before any source-data integration.
`;
}

function main() {
  const rows = readJsonl(INPUT);
  const auditRows = rows.map(auditRow);
  const inventoryIssues = buildInventoryIssues(rows, auditRows);
  const manualQueue = selectManualSample(rows, auditRows);
  const auditById = new Map(auditRows.map((row) => [row.questionId, row]));
  const remediationQueue = rows
    .filter((row) => {
      const audit = auditById.get(row.id);
      return audit?.severity === "P0" || audit?.severity === "P1";
    })
    .map((row) => {
      const audit = auditById.get(row.id);
      return {
        ...row,
        remediationReason: audit?.issueCodes ?? "",
        remediationDetails: audit?.issueDetails ?? "",
        recommendedAction: audit?.recommendedAction ?? "Rewrite before app integration."
      };
    });
  const audit = {
    packageLabel,
    generatedAt: new Date().toISOString(),
    expectedTotal: EXPECTED_TOTAL,
    actualTotal: rows.length,
    inventoryIssues,
    rowIssues: auditRows.filter((row) => row.qaStatus !== "pass"),
    remediationQueueCount: remediationQueue.length,
    manualReviewQueueCount: manualQueue.length
  };

  fs.writeFileSync(AUDIT_JSON, `${JSON.stringify(audit, null, 2)}\n`);
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
    "reviewReason",
    "grade",
    "semester",
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
    "explanationZhHans",
    "evidenceCardIds",
    "assessmentPatternCardIds",
    "mathQaStatus",
    "terminologyQaStatus",
    "manualQaStatus",
    "reviewNotes"
  ]);
  writeCsv(REMEDIATION_QUEUE_CSV, remediationQueue, [
    "id",
    "remediationReason",
    "remediationDetails",
    "recommendedAction",
    "grade",
    "semester",
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
    "explanationZhHans",
    "evidenceCardIds",
    "assessmentPatternCardIds",
    "reviewNotes"
  ]);
  if (!fs.existsSync(MANUAL_REVIEW_RESULTS_CSV)) {
    writeCsv(MANUAL_REVIEW_RESULTS_CSV, manualQueue, [
      "id",
      "reviewDecision",
      "mathQaStatus",
      "terminologyQaStatus",
      "sourceDistanceStatus",
      "reviewerNotes"
    ]);
  }
  fs.writeFileSync(AUDIT_MD, buildMarkdown({ rows, auditRows, inventoryIssues, manualQueue }));
  fs.writeFileSync(RELEASE_DECISION_MD, buildReleaseDecision({ inventoryIssues, manualQueue }));
  console.log(
    `Audit complete: ${rows.length} rows, ${inventoryIssues.length} inventory issues, ${remediationQueue.length} remediation rows, ${manualQueue.length} manual-review rows.`
  );
}

main();
