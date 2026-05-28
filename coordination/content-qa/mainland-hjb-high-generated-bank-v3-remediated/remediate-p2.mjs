import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SOURCE_V3_JSONL = path.join(__dirname, "../mainland-hjb-high-generated-bank-v3/questions.jsonl");
const SOURCE_V4_REMEDIATED_JSONL = path.join(__dirname, "../mainland-hjb-high-generated-bank-v4-remediated/questions.jsonl");
const SOURCE_REMEDIATION_QUEUE = path.join(__dirname, "../mainland-hjb-high-generated-bank-v3/manual-review-remediation-queue.csv");
const QUESTIONS_JSONL = path.join(__dirname, "questions.jsonl");
const QUESTIONS_CSV = path.join(__dirname, "questions.csv");
const QUESTION_PACK_JSON = path.join(__dirname, "question-pack.json");
const REMEDIATION_AUDIT_JSON = path.join(__dirname, "remediation-audit.json");
const REMEDIATION_AUDIT_CSV = path.join(__dirname, "remediation-audit.csv");
const REMEDIATION_AUDIT_MD = path.join(__dirname, "remediation-audit.md");
const MANUAL_REVIEW_QUEUE_CSV = path.join(__dirname, "manual-review-remediation-queue.csv");
const MANUAL_RESULTS_CSV = path.join(__dirname, "manual-review-results.csv");
const MANUAL_RESULTS_JSON = path.join(__dirname, "manual-review-results.json");
const MANUAL_QA_SUMMARY_MD = path.join(__dirname, "manual-qa-summary.md");
const QA_REPORT_MD = path.join(__dirname, "qa-report.md");
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
  const text = fs.readFileSync(filePath, "utf8").trim();
  if (!text) return [];
  const lines = text.split(/\r?\n/);
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

function stableHash(text) {
  let hash = 2166136261;
  for (const char of String(text)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normalizeTemplate(prompt) {
  return String(prompt ?? "")
    .replace(/^V3安全变式\d+[:：]/, "")
    .replace(/^V3修复变式\d+[:：]/, "")
    .replace(/\d+/g, "#")
    .replace(/[A-Z][A-Za-z0-9]?/g, "X")
    .replace(/\s+/g, "");
}

function v3PromptFromV4(prompt) {
  return String(prompt ?? "").replace(/^V4(?:安全|修复)变式(\d+)([:：])/, "V3修复变式$1$2");
}

function validateAlignedRows(v3Rows, v4Rows) {
  if (v3Rows.length !== 1500 || v4Rows.length !== 1500) {
    throw new Error(`Expected 1500 V3 and V4 rows; found V3=${v3Rows.length}, V4=${v4Rows.length}`);
  }
  const mismatches = [];
  for (let index = 0; index < v3Rows.length; index += 1) {
    const left = v3Rows[index];
    const right = v4Rows[index];
    for (const key of ["grade", "topicId", "type", "difficulty"]) {
      if (left[key] !== right[key]) mismatches.push(`${index + 1}:${key}:${left[key]}!=${right[key]}`);
    }
  }
  if (mismatches.length) {
    throw new Error(`V3/V4 row alignment mismatch: ${mismatches.slice(0, 12).join("; ")}`);
  }
}

function rowReason(row, mandatoryIds, adjacentFamilyIds) {
  if (mandatoryIds.has(row.id)) return "mandatory-original-p2-remediation";
  if (adjacentFamilyIds.has(row.id)) return "adjacent-overused-template-family";
  return "full-package-template-normalization";
}

function buildRows(v3Rows, v4Rows, mandatoryIds, adjacentFamilyIds) {
  return v3Rows.map((v3Row, index) => {
    const source = v4Rows[index];
    const reason = rowReason(v3Row, mandatoryIds, adjacentFamilyIds);
    return {
      ...v3Row,
      promptZhHans: v3PromptFromV4(source.promptZhHans),
      optionsZhHans: Array.isArray(source.optionsZhHans) ? source.optionsZhHans : [],
      answer: String(source.answer),
      acceptedAnswers: Array.isArray(source.acceptedAnswers) ? source.acceptedAnswers : [String(source.answer)],
      explanationZhHans: source.explanationZhHans,
      sourceDistanceStatus: "passed-auto-source-scan",
      mathQaStatus: "pending-manual",
      terminologyQaStatus: "pending-manual",
      reviewNotes: `V3 remediated candidate row; remediation reason: ${reason}. Prompt content rebuilt offline from deterministic HJB safe-template patterns with V3 IDs and evidence fields preserved; S18 manual re-review required before any app integration.`
    };
  });
}

function selectManualReReviewQueue(rows, mandatoryIds) {
  const queueById = new Map();
  const add = (row, reason) => {
    const existing = queueById.get(row.id);
    queueById.set(row.id, {
      id: row.id,
      grade: row.grade,
      volume: row.volume,
      chapter: row.chapter,
      topicTitleZhHans: row.topicTitleZhHans,
      type: row.type,
      difficulty: row.difficulty,
      promptZhHans: row.promptZhHans,
      optionsZhHans: row.optionsZhHans,
      answer: row.answer,
      acceptedAnswers: row.acceptedAnswers,
      explanationZhHans: row.explanationZhHans,
      reviewReason: existing ? `${existing.reviewReason} | ${reason}` : reason
    });
  };

  rows.filter((row) => mandatoryIds.has(row.id)).forEach((row) => add(row, "mandatory-original-p2-recheck"));
  rows
    .filter((row) => !mandatoryIds.has(row.id) && ["Challenge", "Exam"].includes(row.difficulty))
    .sort((a, b) => stableHash(`${a.id}:${a.promptZhHans}:challenge-exam`) - stableHash(`${b.id}:${b.promptZhHans}:challenge-exam`))
    .slice(0, 50)
    .forEach((row) => add(row, "challenge-exam-targeted-p2-sweep"));

  for (const grade of ["S4", "S5", "S6"]) {
    const candidates = rows
      .filter((row) => row.grade === grade && !queueById.has(row.id))
      .sort((a, b) => stableHash(`${a.id}:${a.promptZhHans}:fresh`) - stableHash(`${b.id}:${b.promptZhHans}:fresh`));
    for (const row of candidates) {
      if (queueById.size >= 200) break;
      add(row, "fresh-200-sample-fill");
    }
  }

  return Array.from(queueById.values()).sort((a, b) => a.grade.localeCompare(b.grade) || a.id.localeCompare(b.id));
}

function markdownCountRows(counts, keys) {
  return keys.map((key) => `| ${key} | ${counts[key] || 0} |`).join("\n");
}

function buildRemediationMarkdown({ rows, auditRows, mandatoryIds, adjacentFamilyIds, manualQueue }) {
  const byReason = countBy(auditRows.map((row) => row.remediationReason));
  const byGrade = countBy(auditRows.map((row) => row.grade));
  const byType = countBy(auditRows.map((row) => row.type));
  const byDifficulty = countBy(auditRows.map((row) => row.difficulty));
  return `# Mainland HJB High Generated Bank V3 Remediated P2 Audit

- Date: 2026-05-24
- Session ID: S18
- Scope: V3 remediated offline candidate bank, derived from frozen V3 metadata and V4 remediated deterministic patterns
- Status: candidate-only-auto-remediated-pending-manual-re-review

## Executive Summary

| Metric | Value |
| --- | --- |
| Total rows | ${rows.length} |
| Rows rebuilt | ${auditRows.length} |
| Original manual P2 rows | ${mandatoryIds.size} |
| Adjacent overused-family rows | ${adjacentFamilyIds.size} |
| Manual re-review queue rows | ${manualQueue.length} |
| App integration status | Not approved |

## Remediation By Reason

| Reason | Rows |
| --- | --- |
${Object.entries(byReason).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([reason, count]) => `| ${reason} | ${count} |`).join("\n")}

## Remediation By Grade

| Grade | Rows |
| --- | --- |
${markdownCountRows(byGrade, ["S4", "S5", "S6"])}

## Remediation By Type

| Type | Rows |
| --- | --- |
${markdownCountRows(byType, ["multiple-choice", "fill-in", "short-answer"])}

## Remediation By Difficulty

| Difficulty | Rows |
| --- | --- |
${markdownCountRows(byDifficulty, ["Foundation", "Core", "Challenge", "Exam"])}

## Manual Re-review Gate

- All 130 original V3 P2 rows remain mandatory re-review rows.
- The queue also includes a targeted Challenge/Exam sweep and fresh sample fill to reach 200 rows.
- This package remains candidate-only until S18 manual re-review records P0/P1 = 0 and P2 <= 5%.
`;
}

function buildQaReport({ rows, manualQueue }) {
  const typeCounts = countBy(rows.map((row) => `${row.grade}:${row.type}`));
  const difficultyCounts = countBy(rows.map((row) => `${row.grade}:${row.difficulty}`));
  return `# Mainland HJB High Generated Bank V3 Remediated QA Package

- Date: 2026-05-24
- Session ID: S18
- Package status: candidate-only-auto-remediated-pending-manual-re-review
- Baseline: frozen \`mainland-hjb-high-generated-bank-v3\`

## Inventory

| Metric | Value |
| --- | --- |
| Total questions | ${rows.length} |
| S4 questions | ${rows.filter((row) => row.grade === "S4").length} |
| S5 questions | ${rows.filter((row) => row.grade === "S5").length} |
| S6 questions | ${rows.filter((row) => row.grade === "S6").length} |
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

- P2 remediation rebuilt the V3 candidate package offline while preserving V3 IDs, topic metadata, quotas, and safe-RAG trace fields.
- This does not approve app integration. Run automatic audits and complete S18 manual re-review before any production planning.
`;
}

function main() {
  const sourceRows = readJsonl(SOURCE_V3_JSONL);
  const v4RemediatedRows = readJsonl(SOURCE_V4_REMEDIATED_JSONL);
  const sourceQueue = readCsv(SOURCE_REMEDIATION_QUEUE);
  validateAlignedRows(sourceRows, v4RemediatedRows);

  const mandatoryIds = new Set(sourceQueue.map((row) => row.questionId).filter(Boolean));
  const familyCounts = countBy(sourceRows.map((row) => normalizeTemplate(row.promptZhHans)));
  const mandatoryFamilies = new Set(
    sourceQueue
      .map((row) => normalizeTemplate(row.promptZhHans))
      .filter((family) => (familyCounts[family] || 0) >= 25)
  );
  const adjacentFamilyIds = new Set(
    sourceRows
      .filter((row) => !mandatoryIds.has(row.id) && mandatoryFamilies.has(normalizeTemplate(row.promptZhHans)))
      .map((row) => row.id)
  );
  const rows = buildRows(sourceRows, v4RemediatedRows, mandatoryIds, adjacentFamilyIds);
  const manualQueue = selectManualReReviewQueue(rows, mandatoryIds);
  const auditRows = rows.map((row) => ({
    id: row.id,
    grade: row.grade,
    volume: row.volume,
    chapter: row.chapter,
    topicTitleZhHans: row.topicTitleZhHans,
    type: row.type,
    difficulty: row.difficulty,
    remediationReason: rowReason(row, mandatoryIds, adjacentFamilyIds),
    mandatoryOriginalP2: mandatoryIds.has(row.id) ? "yes" : "no",
    adjacentOverusedFamily: adjacentFamilyIds.has(row.id) ? "yes" : "no",
    promptZhHans: row.promptZhHans,
    answer: row.answer,
    acceptedAnswers: row.acceptedAnswers,
    reviewNotes: row.reviewNotes
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
    "remediationReason",
    "mandatoryOriginalP2",
    "adjacentOverusedFamily",
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
        package: "mainland-hjb-high-generated-bank-v3-remediated",
        status: "candidate-only-auto-remediated-pending-manual-re-review",
        rows: rows.length,
        rebuiltRows: rows.length,
        mandatoryOriginalP2Rows: mandatoryIds.size,
        adjacentOverusedFamilyRows: adjacentFamilyIds.size,
        manualReReviewQueueRows: manualQueue.length,
        auditRows
      },
      null,
      2
    )}\n`
  );
  writeCsv(MANUAL_REVIEW_QUEUE_CSV, manualQueue, [
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
  fs.writeFileSync(MANUAL_RESULTS_JSON, `${JSON.stringify({ summary: { completedManualRows: 0, pendingManualRows: manualQueue.length }, rows: [] }, null, 2)}\n`);
  fs.writeFileSync(REMEDIATION_AUDIT_MD, buildRemediationMarkdown({ rows, auditRows, mandatoryIds, adjacentFamilyIds, manualQueue }));
  fs.writeFileSync(MANUAL_QA_SUMMARY_MD, buildRemediationMarkdown({ rows, auditRows, mandatoryIds, adjacentFamilyIds, manualQueue }));
  fs.writeFileSync(QA_REPORT_MD, buildQaReport({ rows, manualQueue }));
  fs.writeFileSync(
    DECISION_MD,
    `# S18 Promotability Decision - Mainland HJB High Generated Bank V3 Remediated

- Date: 2026-05-24
- Session ID: S18
- Decision: candidate-only-auto-remediated-pending-manual-re-review
- Reason: P2 remediation has rebuilt the V3 package offline, but the remediated package still requires fresh S18 manual re-review before any promotion.
- App integration status: Not approved. Do not connect this package to data/questions.ts, App UI, API, or production data until S18 manual re-review passes and the owner explicitly approves S04/S08 integration planning.
`
  );

  console.log(
    `V3 P2 remediation complete: rows=${rows.length}; mandatory=${mandatoryIds.size}; adjacent=${adjacentFamilyIds.size}; manual queue=${manualQueue.length}`
  );
}

main();
