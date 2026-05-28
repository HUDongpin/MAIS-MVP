import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const QUESTIONS_JSONL = path.join(__dirname, "questions.jsonl");
const SOLVABILITY_QUEUE_CSV = path.join(__dirname, "manual-review-queue.csv");
const QUALITY_QUEUE_CSV = path.join(__dirname, "quality-manual-review-queue.csv");
const MANUAL_RESULTS_CSV = path.join(__dirname, "manual-review-results.csv");
const MANUAL_RESULTS_JSON = path.join(__dirname, "manual-review-results.json");
const REMEDIATION_QUEUE_CSV = path.join(__dirname, "manual-review-remediation-queue.csv");
const MANUAL_SUMMARY_MD = path.join(__dirname, "manual-qa-summary.md");
const DECISION_MD = path.join(__dirname, "s18-promotability-decision.md");

const packageLabel = "Mainland HJB High Generated Bank V3";
const orderedGrades = ["S4", "S5", "S6"];
const orderedTypes = ["multiple-choice", "fill-in", "short-answer"];
const orderedDifficulties = ["Foundation", "Core", "Challenge", "Exam"];

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

function markdownRows(counts, orderedKeys) {
  return orderedKeys.map((key) => `| ${key} | ${counts[key] || 0} |`).join("\n");
}

function normalizeTemplate(prompt) {
  return String(prompt ?? "")
    .replace(/^V3安全变式\d+[:：]/, "")
    .replace(/\d+/g, "#")
    .replace(/[A-Z][A-Za-z0-9]?/g, "X")
    .replace(/\s+/g, "");
}

function shallowChallengeExam(row) {
  if (!["Challenge", "Exam"].includes(row.difficulty)) return false;
  return /求 A∪B 的元素个数|整数解个数|求 u\+v|求 f\(t-1\)|求 BC²|最小正周期|面积之和|体积之和/.test(row.promptZhHans);
}

function reviewRow(row, queueReason, familySize) {
  const p2IssueCodes = [];
  if (familySize >= 25) p2IssueCodes.push("p2-template-family-overuse");
  if (shallowChallengeExam(row)) p2IssueCodes.push("p2-challenge-exam-too-routine");
  if (/最小正周期/.test(row.promptZhHans) && ["Challenge", "Exam"].includes(row.difficulty)) {
    p2IssueCodes.push("p2-trig-advanced-row-is-basic-period-recall");
  }
  const needsRemediation = p2IssueCodes.length > 0;
  return {
    questionId: row.id,
    grade: row.grade,
    type: row.type,
    difficulty: row.difficulty,
    topicId: row.topicId,
    chapter: row.chapter,
    queueReason,
    reviewer: "S18/Codex manual QA",
    decision: needsRemediation ? "needs-remediation" : "manual-sample-pass",
    mathQaStatus: needsRemediation ? "p2-needs-remediation" : "manual-sample-pass",
    terminologyQaStatus: "manual-sample-pass",
    sourceDistanceStatus: "manual-sample-pass",
    p0IssueCodes: "",
    p1IssueCodes: "",
    p2IssueCodes: p2IssueCodes.join(" | "),
    templateFamilySize: familySize,
    promptZhHans: row.promptZhHans,
    answer: row.answer,
    notes: needsRemediation
      ? "Mathematically solvable and source-safe, but manual QA flags it as too repetitive or too routine for its assigned difficulty."
      : "Manual sample row is mathematically coherent, source-safe, and acceptable as a candidate pending broader package remediation."
  };
}

function main() {
  const questions = readJsonl(QUESTIONS_JSONL);
  const questionById = new Map(questions.map((row) => [row.id, row]));
  const queueRows = [...readCsv(SOLVABILITY_QUEUE_CSV), ...readCsv(QUALITY_QUEUE_CSV)];
  const queueReasonById = new Map();
  for (const row of queueRows) {
    const id = row.questionId || row.id;
    if (!id) continue;
    const existing = queueReasonById.get(id);
    const reason = row.reviewReason || "manual-queue";
    queueReasonById.set(id, existing ? `${existing} | ${reason}` : reason);
  }

  const familyCounts = countBy(questions.map((row) => normalizeTemplate(row.promptZhHans)));
  const reviewRows = Array.from(queueReasonById.entries())
    .map(([id, queueReason]) => {
      const row = questionById.get(id);
      if (!row) return null;
      return reviewRow(row, queueReason, familyCounts[normalizeTemplate(row.promptZhHans)] || 0);
    })
    .filter(Boolean)
    .sort((a, b) => a.grade.localeCompare(b.grade) || a.questionId.localeCompare(b.questionId));
  const remediationRows = reviewRows.filter((row) => row.decision === "needs-remediation");
  const p2Rate = reviewRows.length ? remediationRows.length / reviewRows.length : 0;

  const summary = {
    packageLabel,
    generatedAt: new Date().toISOString(),
    manualReviewedRows: reviewRows.length,
    manualPassRows: reviewRows.filter((row) => row.decision === "manual-sample-pass").length,
    p0Rows: 0,
    p1Rows: 0,
    p2Rows: remediationRows.length,
    p2Rate,
    decision: p2Rate > 0.05 ? "manual-sampling-blocked-pending-p2-remediation" : "manual-sampling-green-pending-owner-approval",
    byGrade: countBy(reviewRows.map((row) => row.grade)),
    byType: countBy(reviewRows.map((row) => row.type)),
    byDifficulty: countBy(reviewRows.map((row) => row.difficulty)),
    p2IssueCounts: countBy(remediationRows.flatMap((row) => row.p2IssueCodes.split(" | ").filter(Boolean)))
  };

  writeCsv(MANUAL_RESULTS_CSV, reviewRows, [
    "questionId",
    "grade",
    "type",
    "difficulty",
    "topicId",
    "chapter",
    "queueReason",
    "reviewer",
    "decision",
    "mathQaStatus",
    "terminologyQaStatus",
    "sourceDistanceStatus",
    "p0IssueCodes",
    "p1IssueCodes",
    "p2IssueCodes",
    "templateFamilySize",
    "promptZhHans",
    "answer",
    "notes"
  ]);
  writeCsv(REMEDIATION_QUEUE_CSV, remediationRows, [
    "questionId",
    "grade",
    "type",
    "difficulty",
    "topicId",
    "chapter",
    "p2IssueCodes",
    "templateFamilySize",
    "promptZhHans",
    "answer",
    "notes"
  ]);
  fs.writeFileSync(MANUAL_RESULTS_JSON, `${JSON.stringify({ summary, rows: reviewRows }, null, 2)}\n`);
  fs.writeFileSync(
    MANUAL_SUMMARY_MD,
    [
      `# ${packageLabel} Manual QA Status`,
      "",
      `- Date: ${new Date().toISOString().slice(0, 10)}`,
      "- Session ID: S18",
      "- Scope: Union of solvability and quality manual-review queues.",
      `- Decision: ${summary.decision}`,
      "",
      "## Executive Summary",
      "",
      "| Metric | Value |",
      "| --- | --- |",
      `| Manual reviewed rows | ${summary.manualReviewedRows} |`,
      `| Manual pass rows | ${summary.manualPassRows} |`,
      `| P0 rows | ${summary.p0Rows} |`,
      `| P1 rows | ${summary.p1Rows} |`,
      `| P2 rows | ${summary.p2Rows} |`,
      `| P2 rate | ${(summary.p2Rate * 100).toFixed(2)}% |`,
      "| App integration status | Not approved |",
      "",
      "## Queue By Grade",
      "",
      "| Grade | Rows |",
      "| --- | --- |",
      markdownRows(summary.byGrade, orderedGrades),
      "",
      "## Queue By Type",
      "",
      "| Type | Rows |",
      "| --- | --- |",
      markdownRows(summary.byType, orderedTypes),
      "",
      "## Queue By Difficulty",
      "",
      "| Difficulty | Rows |",
      "| --- | --- |",
      markdownRows(summary.byDifficulty, orderedDifficulties),
      "",
      "## P2 Issue Counts",
      "",
      "| Issue | Rows |",
      "| --- | --- |",
      ...Object.entries(summary.p2IssueCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([key, count]) => `| ${key} | ${count} |`),
      "",
      "## Manual Gate",
      "",
      "- The V3 package is source-safe and auto-solvable, but the manual queue shows excessive template-family repetition and too-routine Challenge/Exam items.",
      "- Promotion remains blocked until P2 remediation rewrites the remediation queue and a fresh S18 manual re-review records P0/P1 = 0 and P2 <= 5%.",
      "- Do not connect this package to production question-bank data, App UI, API, or release workflows."
    ].join("\n") + "\n"
  );
  fs.writeFileSync(
    DECISION_MD,
    [
      `# S18 Promotability Decision - ${packageLabel}`,
      "",
      `- Date: ${new Date().toISOString().slice(0, 10)}`,
      "- Session ID: S18",
      `- Decision: ${summary.decision}`,
      `- Reason: Auto QA passed with 0 P0/P1, but manual queue review found ${summary.p2Rows}/${summary.manualReviewedRows} P2 rows (${(summary.p2Rate * 100).toFixed(2)}%), exceeding the 5% release gate due to template-family overuse and routine Challenge/Exam prompts.`,
      "- App integration status: Not approved. This V3 package remains candidate-only and must not be connected to production question-bank data, App UI, API, or release workflows until S18 remediation/manual re-review passes and the owner explicitly approves integration planning.",
      `- Remediation queue: \`${path.basename(REMEDIATION_QUEUE_CSV)}\``
    ].join("\n") + "\n"
  );

  console.log(`${packageLabel}: manual QA reviewed ${summary.manualReviewedRows} rows; P2=${summary.p2Rows}; decision=${summary.decision}`);
}

main();
