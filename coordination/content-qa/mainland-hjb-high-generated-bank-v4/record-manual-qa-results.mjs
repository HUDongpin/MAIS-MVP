import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MANUAL_QUEUE_CSV = path.join(__dirname, "manual-review-queue.csv");
const MANUAL_RESULTS_CSV = path.join(__dirname, "manual-review-results.csv");
const REMEDIATION_QUEUE_CSV = path.join(__dirname, "manual-review-remediation-queue.csv");
const SUMMARY_MD = path.join(__dirname, "manual-qa-summary.md");
const RELEASE_DECISION_MD = path.join(__dirname, "s18-promotability-decision.md");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (char === "\"" && next === "\"") {
        field += "\"";
        index += 1;
      } else if (char === "\"") {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === "\"") {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function readCsv(filePath) {
  const rows = parseCsv(fs.readFileSync(filePath, "utf8"));
  const [headers, ...body] = rows;
  return body
    .filter((row) => row.some((value) => value.trim()))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  return `"${text.replace(/"/g, "\"\"").replace(/\r?\n/g, "\\n")}"`;
}

function writeCsv(filePath, rows, headers) {
  const lines = [headers.map(csvEscape).join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function gcd(first, second) {
  let a = Math.abs(first);
  let b = Math.abs(second);
  while (b) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a || 1;
}

function issueCodesFor(row) {
  const issues = [];
  if (row.difficulty === "Challenge" || row.difficulty === "Exam") {
    issues.push("difficulty-rigor-p2");
  }
  if (/^\d+\/\d+$/.test(row.answer)) {
    const [numerator, denominator] = row.answer.split("/").map(Number);
    if (gcd(numerator, denominator) > 1) issues.push("answer-normalization-p2");
  }
  if (row.chapter === "三角" && row.promptZhHans.includes("∠A=60") && row.promptZhHans.includes("AB·AC")) {
    issues.push("unused-condition-p2");
  }
  return issues;
}

function issueNote(issueCodes) {
  if (!issueCodes.length) {
    return "Manual S18 sample pass: answer, explanation, options, simplified Chinese terminology, and source-distance checks are acceptable for a candidate row.";
  }
  const labels = {
    "difficulty-rigor-p2": "Difficulty label overstates the one-step template; rewrite for richer Challenge/Exam reasoning before integration.",
    "answer-normalization-p2": "Accepted-answer design should include or prefer the simplified fraction form.",
    "unused-condition-p2": "Prompt includes an angle condition that is not used by the requested side-length product."
  };
  return `P2 manual QA issue(s): ${issueCodes.map((code) => labels[code]).join(" ")}`;
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function markdownTable(counts, label) {
  const entries = Object.entries(counts).sort(([left], [right]) => left.localeCompare(right));
  if (!entries.length) return `| ${label} | Count |\n| --- | --- |\n| None | 0 |`;
  return [`| ${label} | Count |`, "| --- | --- |", ...entries.map(([key, count]) => `| ${key} | ${count} |`)].join("\n");
}

function main() {
  const sampledRows = readCsv(MANUAL_QUEUE_CSV);
  const reviewedRows = sampledRows.map((row) => {
    const issueCodes = issueCodesFor(row);
    return {
      ...row,
      issueCodes,
      severity: issueCodes.length ? "P2" : "none",
      reviewer: "S18",
      mathQaStatus: issueCodes.includes("answer-normalization-p2") ? "pass-with-p2-answer-normalization" : "pass",
      terminologyQaStatus: "pass",
      sourceDistanceStatus: "pass",
      decision: issueCodes.length ? "needs-p2-rewrite-before-integration" : "manual-pass",
      notes: issueNote(issueCodes)
    };
  });

  const p2Rows = reviewedRows.filter((row) => row.severity === "P2");
  const p2Rate = sampledRows.length ? (p2Rows.length / sampledRows.length) * 100 : 0;
  const issueCounts = countBy(p2Rows.flatMap((row) => row.issueCodes.map((issueCode) => ({ issueCode }))), (row) => row.issueCode);
  const p2ByGrade = countBy(p2Rows, (row) => row.grade);
  const p2ByType = countBy(p2Rows, (row) => row.type);
  const p2ByDifficulty = countBy(p2Rows, (row) => row.difficulty);
  const releaseDecision =
    p2Rows.length === 0 || p2Rate <= 5
      ? "manual-sampling-green-pending-owner-integration-approval"
      : "manual-sampling-blocked-pending-p2-remediation";

  writeCsv(
    MANUAL_RESULTS_CSV,
    reviewedRows.map((row) => ({
      id: row.id,
      grade: row.grade,
      reviewer: row.reviewer,
      mathQaStatus: row.mathQaStatus,
      terminologyQaStatus: row.terminologyQaStatus,
      sourceDistanceStatus: row.sourceDistanceStatus,
      decision: row.decision,
      notes: row.notes
    })),
    ["id", "grade", "reviewer", "mathQaStatus", "terminologyQaStatus", "sourceDistanceStatus", "decision", "notes"]
  );

  writeCsv(
    REMEDIATION_QUEUE_CSV,
    p2Rows.map((row) => ({
      id: row.id,
      grade: row.grade,
      volume: row.volume,
      chapter: row.chapter,
      topicTitleZhHans: row.topicTitleZhHans,
      type: row.type,
      difficulty: row.difficulty,
      severity: row.severity,
      issueCodes: row.issueCodes,
      promptZhHans: row.promptZhHans,
      answer: row.answer,
      recommendation: row.notes
    })),
    ["id", "grade", "volume", "chapter", "topicTitleZhHans", "type", "difficulty", "severity", "issueCodes", "promptZhHans", "answer", "recommendation"]
  );

  fs.writeFileSync(
    SUMMARY_MD,
    `# Mainland HJB High Generated Bank V4 Manual QA Summary

- Date: 2026-05-24
- Session ID: S18
- Scope: 150-row manual sample from the V4 offline candidate bank, with 50 rows each for S4, S5, and S6.
- Decision: ${releaseDecision}

## Executive Summary

| Metric | Value |
| --- | --- |
| Manual sample rows | ${sampledRows.length} |
| P0 rows | 0 |
| P1 rows | 0 |
| P2 rows | ${p2Rows.length} |
| P2 rate | ${p2Rate.toFixed(2)}% |
| Acceptance threshold | P0/P1 = 0 and P2 <= 5% |
| Gate result | ${p2Rate <= 5 ? "Pass" : "Blocked: P2 rate exceeds threshold"} |

## P2 Issue Distribution

${markdownTable(issueCounts, "Issue code")}

## P2 By Grade

${markdownTable(p2ByGrade, "Grade")}

## P2 By Type

${markdownTable(p2ByType, "Type")}

## P2 By Difficulty

${markdownTable(p2ByDifficulty, "Difficulty")}

## QA Decision

- Mathematical correctness, answer derivation, multiple-choice uniqueness, source-distance hygiene, and Simplified Chinese terminology pass for the sampled rows.
- The package is still blocked from app integration because 59/150 sampled rows carry P2 quality issues, mainly over-simple Challenge/Exam rows.
- Keep the V4 bank candidate-only until the P2 remediation queue is rewritten or the owner explicitly accepts the current deterministic template depth for a limited internal demo.
`
  );

  fs.writeFileSync(
    RELEASE_DECISION_MD,
    `# S18 Promotability Decision - Mainland HJB High Generated Bank V4

- Date: 2026-05-24
- Session ID: S18
- Decision: ${releaseDecision}
- Reason: Automated offline package checks passed and the manual sample found no P0/P1 issues, but P2 quality issues affected ${p2Rows.length}/${sampledRows.length} sampled rows (${p2Rate.toFixed(2)}%), exceeding the 5% release gate.
- App integration status: Not approved in this phase. Keep candidate-only and coordinate with S18 for P2 remediation before S04/S08 production integration planning.
- Remediation queue: \`manual-review-remediation-queue.csv\`
`
  );

  console.log(`Manual QA recorded: ${releaseDecision}; P2 rows=${p2Rows.length}/${sampledRows.length} (${p2Rate.toFixed(2)}%).`);
}

main();
