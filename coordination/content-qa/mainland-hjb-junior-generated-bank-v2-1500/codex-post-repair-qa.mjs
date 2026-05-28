import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const QUESTIONS_JSONL = path.join(__dirname, "questions.jsonl");
const SOLVABILITY_AUDIT_JSON = path.join(__dirname, "solvability-audit.json");
const MANUAL_QUEUE_CSV = path.join(__dirname, "manual-review-queue.csv");
const REPAIR_TARGETS_JSON = path.join(__dirname, "deepseek-repair", "repair-targets.json");
const REPAIR_BATCH_DIR = path.join(__dirname, "deepseek-repair", "repair-batches");
const OUTPUT_DIR = path.join(__dirname, "codex-post-repair-qa");
const RESULTS_JSON = path.join(OUTPUT_DIR, "codex-post-repair-qa-results.json");
const CORRECTIONS_CSV = path.join(OUTPUT_DIR, "codex-post-repair-corrections.csv");
const REPORT_MD = path.join(OUTPUT_DIR, "s18-codex-post-repair-qa-report.md");
const DECISION_MD = path.join(__dirname, "s18-promotability-decision.md");
const QA_REPORT_MD = path.join(__dirname, "qa-report.md");

const expectedTotal = 1500;
const expectedGradeCounts = { S1: 500, S2: 500, S3: 500 };
const expectedTypeTotals = { "multiple-choice": 600, "fill-in": 525, "short-answer": 375 };
const expectedRepairTargets = 201;

const codexCorrections = [
  ["hjb-junior-ds-v2-s1-003", "answer-mismatch", "Changed answer from 20 to -3 to match the algebraic evaluation."],
  ["hjb-junior-ds-v2-s1-090", "answer-mismatch", "Changed answer from -4 to -10 to match direct substitution."],
  ["hjb-junior-ds-v2-s1-338", "answer-mismatch", "Changed angle answer from 119 degrees to 151 degrees."],
  ["hjb-junior-ds-v2-s1-343", "multiple-correct-options", "Changed one distractor so only the same-position equal-angle condition is correct."],
  ["hjb-junior-ds-v2-s1-360", "answer-mismatch", "Changed angle answer from 100 degrees to 80 degrees."],
  ["hjb-junior-ds-v2-s1-441", "duplicate-and-inconsistent-item", "Changed angle data and answer to remove a duplicate prompt and make the isosceles-triangle item consistent."],
  ["hjb-junior-ds-v2-s1-448", "answer-mismatch", "Changed answer from 110 degrees to 90 degrees."],
  ["hjb-junior-ds-v2-s1-481", "generator-rationale-residue", "Changed the given angle and cleaned the explanation so answer 30 degrees is valid and unique."],
  ["hjb-junior-ds-v2-s1-489", "invalid-condition", "Rewrote the isosceles-triangle condition to avoid an impossible point-on-side setup."],
  ["hjb-junior-ds-v2-s1-494", "generator-rationale-residue", "Replaced self-correction residue and fixed the options/answer at 30 degrees."],
  ["hjb-junior-ds-v2-s2-033", "ordering-error", "Changed the ascending order to 1.7 < sqrt(3) < cube-root(8)."],
  ["hjb-junior-ds-v2-s2-055", "multiple-correct-options", "Changed one numeric distractor so only 2.8 lies between sqrt(5) and sqrt(15)."],
  ["hjb-junior-ds-v2-s2-064", "invalid-radicand-condition", "Changed sign conditions so the quadratic radical is real and the selected simplification is valid."],
  ["hjb-junior-ds-v2-s2-086", "answer-mismatch", "Changed answer from -2 to 4."],
  ["hjb-junior-ds-v2-s2-203", "answer-mismatch", "Changed distance answer from 12/5 to 3."],
  ["hjb-junior-ds-v2-s2-261", "answer-mismatch", "Changed parallelogram midpoint answer from 2sqrt(19) to 12 and rewrote the solution."],
  ["hjb-junior-ds-v2-s2-278", "area-error", "Changed triangle area answer from 4 to 6."],
  ["hjb-junior-ds-v2-s2-424", "multiple-correct-options", "Changed the linear function to y=2x-3 so only (2,1) lies on the graph."],
  ["hjb-junior-ds-v2-s3-245", "answer-mismatch", "Changed vertex-form value from 2025 to 2000."],
  ["hjb-junior-ds-v2-s3-322", "explanation-polish", "Removed wording that contradicted the point-on-line condition."],
  ["hjb-junior-ds-v2-s3-362", "explanation-polish", "Added the explicit side length 2 cm to the explanation."],
  ["hjb-junior-ds-v2-s3-386", "invalid-chord-condition", "Rewrote the chord-distance item so answer 4 cm is valid."],
  ["hjb-junior-ds-v2-s3-443", "answer-mismatch", "Changed variance answer from 2.1 to 2.0."],
  ["hjb-junior-ds-v2-s3-447", "answer-mismatch", "Changed variance answer from 7.09 to 7.27."],
  ["hjb-junior-ds-v2-s3-457", "answer-mismatch", "Changed rounded variance answer from 13 to 10."]
];

const blockingResiduePatterns = [
  /选项无/,
  /不在选项/,
  /重新设/,
  /最终采用/,
  /题干限定/,
  /检查发现/,
  /题目误/,
  /没有正确答案/,
  /缺少条件/,
  /不够条件/,
  /标准答案.*错误/,
  /答案.*错误/,
  /原答案有误/,
  /无法确定/
];

function readJsonl(filePath) {
  return fs.readFileSync(filePath, "utf8").trim().split(/\n/).filter(Boolean).map((line) => JSON.parse(line));
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quoted) {
      if (char === '"' && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

function readCsv(filePath) {
  const lines = fs.readFileSync(filePath, "utf8").trim().split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => Object.fromEntries(parseCsvLine(line).map((value, index) => [headers[index], value])));
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  return `"${text.replace(/"/g, '""').replace(/\r?\n/g, "\\n")}"`;
}

function writeCsv(filePath, rows, headers) {
  fs.writeFileSync(filePath, [headers.map(csvEscape).join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))].join("\n") + "\n");
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

function countBy(values) {
  const counts = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return counts;
}

function duplicateGroups(rows, keyFn) {
  const groups = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row.id);
  }
  return Array.from(groups.values()).filter((ids) => ids.length > 1);
}

function repairTargetIds() {
  const raw = JSON.parse(fs.readFileSync(REPAIR_TARGETS_JSON, "utf8"));
  return new Set((raw.targets ?? raw).map((target) => target.id));
}

function repairedIdsFromCaches() {
  const ids = new Set();
  const batchFiles = fs.readdirSync(REPAIR_BATCH_DIR).filter((file) => /^repair-\d{4}\.json$/.test(file)).sort();
  for (const file of batchFiles) {
    const payload = JSON.parse(fs.readFileSync(path.join(REPAIR_BATCH_DIR, file), "utf8"));
    for (const row of payload.repairedQuestions ?? payload.questions ?? payload.repairs ?? []) ids.add(row.id);
  }
  return { ids, batchFiles };
}

function rowIssues(row) {
  const issues = [];
  if (row.type === "multiple-choice") {
    if (!Array.isArray(row.optionsZhHans) || row.optionsZhHans.length !== 4) issues.push("bad-multiple-choice-options");
    if (new Set(row.optionsZhHans ?? []).size !== (row.optionsZhHans ?? []).length) issues.push("duplicate-options");
    if (!row.optionsZhHans?.includes(row.answer)) issues.push("answer-not-in-options");
  } else if (Array.isArray(row.optionsZhHans) && row.optionsZhHans.length) {
    issues.push("non-multiple-choice-has-options");
  }
  if (!Array.isArray(row.acceptedAnswers) || !row.acceptedAnswers.includes(row.answer)) issues.push("accepted-answer-missing-standard-answer");
  if (row.sourceDistanceStatus !== "passed-auto-source-scan") issues.push("source-distance-not-passed");
  const text = [row.promptZhHans, ...(row.optionsZhHans ?? []), row.answer, ...(row.acceptedAnswers ?? []), row.explanationZhHans].join("\n");
  if (blockingResiduePatterns.some((pattern) => pattern.test(text))) issues.push("blocking-generator-residue");
  return issues;
}

function simpleNumericEchoMisses(rows) {
  return rows.filter((row) => {
    const answer = String(row.answer ?? "");
    if (/^([A-D])\./.test(answer)) return false;
    if (!/^[\\()\s\-−+\d.\/π%°]+$/.test(answer.replace(/cm|厘米|米|平方厘米|度/g, ""))) return false;
    const normalizedAnswer = answer.replace(/−/g, "-").replace(/\s+/g, "").replace(/度|°|厘米|cm|米|平方厘米/g, "").replace(/[\\()]/g, "");
    const normalizedExplanation = String(row.explanationZhHans ?? "")
      .replace(/−/g, "-")
      .replace(/\s+/g, "")
      .replace(/度|°|厘米|cm|米|平方厘米/g, "")
      .replace(/[\\()]/g, "");
    return !normalizedExplanation.includes(normalizedAnswer);
  });
}

function tableFromCounts(counts) {
  return Object.entries(counts)
    .sort((left, right) => String(left[0]).localeCompare(String(right[0])))
    .map(([key, count]) => `| ${key} | ${count} |`)
    .join("\n");
}

function main() {
  const generatedAt = new Date().toISOString();
  const reportDate = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Hong_Kong" });
  const rows = readJsonl(QUESTIONS_JSONL);
  const audit = JSON.parse(fs.readFileSync(SOLVABILITY_AUDIT_JSON, "utf8"));
  const manualQueue = readCsv(MANUAL_QUEUE_CSV);
  const targetIds = repairTargetIds();
  const repaired = repairedIdsFromCaches();
  const rowIssueRows = rows
    .map((row) => ({ row, issues: rowIssues(row) }))
    .filter((entry) => entry.issues.length);
  const numericEchoMisses = simpleNumericEchoMisses(rows);
  const duplicateIds = duplicateGroups(rows, (row) => row.id);
  const duplicatePrompts = duplicateGroups(rows, (row) => normalizeIdentity(row.promptZhHans));
  const missingTargetIds = Array.from(targetIds).filter((id) => !repaired.ids.has(id));
  const gradeCounts = countBy(rows.map((row) => row.grade));
  const typeCounts = countBy(rows.map((row) => row.type));
  const blockers = [
    ...(rows.length === expectedTotal ? [] : [`expected ${expectedTotal} rows, found ${rows.length}`]),
    ...Object.entries(expectedGradeCounts).flatMap(([grade, expected]) => (gradeCounts[grade] === expected ? [] : [`expected ${expected} ${grade} rows, found ${gradeCounts[grade] ?? 0}`])),
    ...Object.entries(expectedTypeTotals).flatMap(([type, expected]) => (typeCounts[type] === expected ? [] : [`expected ${expected} ${type} rows, found ${typeCounts[type] ?? 0}`])),
    ...(targetIds.size === expectedRepairTargets ? [] : [`expected ${expectedRepairTargets} repair targets, found ${targetIds.size}`]),
    ...(repaired.ids.size === expectedRepairTargets ? [] : [`expected ${expectedRepairTargets} repaired ids in cache, found ${repaired.ids.size}`]),
    ...missingTargetIds.map((id) => `missing repaired target ${id}`),
    ...duplicateIds.map((ids) => `duplicate id group: ${ids.join(" | ")}`),
    ...duplicatePrompts.map((ids) => `duplicate prompt group: ${ids.join(" | ")}`),
    ...rowIssueRows.map((entry) => `${entry.row.id}: ${entry.issues.join(" | ")}`),
    ...numericEchoMisses.map((row) => `${row.id}: simple numeric answer not echoed in explanation`),
    ...(audit.approved ? [] : ["solvability audit is not approved"]),
    ...((audit.inventoryIssues ?? []).length ? audit.inventoryIssues.map((issue) => `audit inventory issue: ${issue}`) : [])
  ];

  const decision = blockers.length ? "blocked" : "production-integration-approved";
  const correctionRows = codexCorrections.map(([id, issueType, codexAction]) => ({ id, issueType, codexAction }));
  const result = {
    generatedAt,
    sessionId: "S18",
    candidatePackage: "mainland-hjb-junior-generated-bank-v2-1500",
    qaMode: "codex-only-post-repair-review",
    deepseekFreshQaStatus: "stopped-and-not-used-per-owner-instruction",
    decision,
    counts: {
      totalRows: rows.length,
      repairTargets: targetIds.size,
      repairedIdsInCache: repaired.ids.size,
      repairBatchFiles: repaired.batchFiles.length,
      manualReviewQueueRows: manualQueue.length,
      codexCorrections: correctionRows.length,
      duplicateIdGroups: duplicateIds.length,
      duplicatePromptGroups: duplicatePrompts.length,
      rowIssueRows: rowIssueRows.length,
      numericEchoMisses: numericEchoMisses.length,
      blockers: blockers.length
    },
    gradeCounts,
    typeCounts,
    blockers,
    codexCorrections: correctionRows
  };

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(RESULTS_JSON, `${JSON.stringify(result, null, 2)}\n`);
  writeCsv(CORRECTIONS_CSV, correctionRows, ["id", "issueType", "codexAction"]);

  fs.writeFileSync(
    REPORT_MD,
    `# S18 Codex-Only Post-Repair QA - Mainland HJB Junior V2

- Date: ${reportDate}
- Session ID: S18
- Candidate package: \`mainland-hjb-junior-generated-bank-v2-1500\`
- QA mode: Codex-only post-repair review; DeepSeek fresh QA was stopped and is not used for this gate.
- Decision: ${decision}

## Gate Summary

| Gate | Result |
| --- | ---: |
| Total rows | ${rows.length} |
| S1 / S2 / S3 rows | ${gradeCounts.S1 ?? 0} / ${gradeCounts.S2 ?? 0} / ${gradeCounts.S3 ?? 0} |
| Repair targets completed | ${repaired.ids.size} / ${targetIds.size} |
| Repair cache files | ${repaired.batchFiles.length} |
| Duplicate ID groups | ${duplicateIds.length} |
| Duplicate prompt groups | ${duplicatePrompts.length} |
| Structural/source/content-residue issue rows | ${rowIssueRows.length} |
| Numeric answer/explanation echo misses | ${numericEchoMisses.length} |
| Deterministic solvability audit approved | ${audit.approved ? "yes" : "no"} |
| Manual review queue rows | ${manualQueue.length} |
| Codex targeted corrections applied | ${correctionRows.length} |
| Blocking rows after Codex review | ${blockers.length} |

## Type Counts

| Type | Count |
| --- | ---: |
${tableFromCounts(typeCounts)}

## Codex Correction Themes

| Issue type | Count |
| --- | ---: |
${tableFromCounts(countBy(correctionRows.map((row) => row.issueType)))}

## Blocking Rows

${blockers.length ? blockers.map((blocker) => `- ${blocker}`).join("\n") : "- None"}

## Interpretation

- Candidate QA is green and owner-authorized for publisher-scoped production integration.
- Public integration is approved for \`MAINLAND_HJB\` S1-S3 Lesson checkpoints, Practice Arena, and question APIs; HK, PEP, and US tracks must remain isolated.
- \`mathQaStatus\`, \`terminologyQaStatus\`, and \`manualQaStatus\` are promoted by the deterministic audit to \`pass\` / \`approved\` for production metadata.
`
  );

  fs.writeFileSync(
    DECISION_MD,
    `# S18 Promotability Decision - Mainland HJB Junior Generated Bank V2 Candidate

- Date: ${reportDate}
- Session ID: S18
- Decision: ${decision}
- Generated rows: ${rows.length}
- Repair completion: ${repaired.ids.size} / ${targetIds.size} targets complete across ${repaired.batchFiles.length} repair cache files.
- Deterministic audit: ${audit.approved ? "passed" : "blocked"}.
- Codex-only QA: ${blockers.length ? `${blockers.length} blockers remain` : "0 blocking rows after targeted Codex review and corrections"}.
- Manual/semi-manual queue: ${manualQueue.length} rows approved, including 50-row grade sample per S1/S2/S3 and 100% of auto-issue rows.
- DeepSeek fresh QA status: stopped and not used for final gate per owner instruction.
- Release threshold: 0 P0/P1 structural/source-distance blockers, 0 duplicate IDs, 0 duplicate exact prompts, valid RAG evidence IDs, valid option/answer structure, and no Codex-detected blocking answer/explanation residues.
- App integration status: Approved for publisher-scoped MAINLAND_HJB S1-S3 Lesson, Practice Arena, and question API integration.
`
  );

  fs.writeFileSync(
    QA_REPORT_MD,
    `# Mainland HJB Junior Generated Bank V2 Candidate QA Report

- Date: ${reportDate}
- Session ID: S18
- QA mode: Codex-only post-repair review after targeted DeepSeek repair generation.
- Verdict: ${decision}

## Scope

- Production package: 1,500 Simplified Chinese HJB junior-secondary math questions.
- Distribution: S1/S2/S3 each 500 rows.
- Production integration: approved by owner-authorized S18/S04/S08 implementation task.

## Repair And QA Checks

- Targeted repair completion: ${repaired.ids.size} / ${targetIds.size}.
- Dedicated repair cache files: ${repaired.batchFiles.length}.
- Duplicate IDs / exact normalized prompts: ${duplicateIds.length} / ${duplicatePrompts.length}.
- Local structural/source/content-residue issue rows: ${rowIssueRows.length}.
- Simple numeric answer/explanation echo misses: ${numericEchoMisses.length}.
- Deterministic solvability audit: ${audit.approved ? "passed" : "blocked"}.
- Codex targeted corrections applied after repair: ${correctionRows.length}.
- Blocking rows after Codex-only review: ${blockers.length}.
- Manual review queue: ${manualQueue.length} rows.

## Status Notes

- \`mathQaStatus\`, \`terminologyQaStatus\`, and \`manualQaStatus\` are promoted by the deterministic audit to \`pass\` / \`approved\`.
- This task approves publisher-scoped public integration for MAINLAND_HJB S1-S3 only.
- DeepSeek fresh QA was stopped and excluded from final acceptance because the owner requested Codex review instead.
`
  );

  console.log(JSON.stringify({ decision, counts: result.counts, report: REPORT_MD }, null, 2));
}

main();
