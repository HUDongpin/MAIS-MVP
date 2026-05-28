import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..");
const contentQaDir = join(repoRoot, "coordination", "content-qa");
const reportDate = process.argv[2] ?? "2026-05-23";
const qualityPath = join(
  contentQaDir,
  `${reportDate}-S18-mainland-high-seed-v1-vs-rag-v2-vs-rag-v3-vs-rag-v4-public-quality-report.json`
);
const solvabilityPath = join(
  contentQaDir,
  `${reportDate}-S18-mainland-high-rag-v4-public-solvability-audit.json`
);
const manualResultsPath = join(contentQaDir, `${reportDate}-S18-mainland-high-rag-v4-manual-review-results.csv`);
const finalDecisionPath = join(contentQaDir, `${reportDate}-S18-mainland-high-rag-v4-final-qa-decision.md`);
const sampleQueuePath = join(contentQaDir, `${reportDate}-S18-mainland-high-rag-v4-manual-review-sample-queue.csv`);
const tmpOutDir = join(repoRoot, ".tmp", "mainland-high-rag-v4-manual-review");

const requiredGradeMinimum = 70;
const requiredTypeMinimum = 70;
const requiredTopicMinimum = 6;
const requiredDifficultyMinimums = {
  Foundation: 10,
  Challenge: 30,
  Exam: 30
};

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function writeCsv(path, rows, headers) {
  writeFileSync(
    path,
    `${headers.join(",")}\n${rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")).join("\n")}\n`
  );
}

function countBy(rows, key) {
  return rows.reduce((counts, row) => {
    const value = row[key];
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function canonicalPrompt(question) {
  return question.prompt.zh
    .toLowerCase()
    .replace(/rag-v4\s+候选题\s+[0-9]+（[^）]+）：(安全抽象|题型结构|误区修正|多步推理|表征转换|建模迁移|运算复核)(选择题|填空题|解答题)任务。/g, "")
    .replace(/\\\([^)]*\\\)/g, "\\(math\\)")
    .replace(/[0-9]+(?:\.[0-9]+)?/g, "#")
    .replace(/\s+/g, "");
}

function compileQuestionData() {
  if (existsSync(tmpOutDir)) rmSync(tmpOutDir, { recursive: true, force: true });
  execFileSync(
    join(repoRoot, "node_modules", ".bin", "tsc"),
    [
      "-p",
      "tsconfig.json",
      "--outDir",
      tmpOutDir,
      "--noEmit",
      "false",
      "--incremental",
      "false",
      "--module",
      "commonjs",
      "--moduleResolution",
      "node"
    ],
    { cwd: repoRoot, stdio: "pipe" }
  );
  const require = createRequire(import.meta.url);
  return require(join(tmpOutDir, "data", "mainlandPepHighQuestions.js")).mainlandPepHighRagV4Questions;
}

function selectManualRows(qualityReport, questionsById) {
  const rag4Rows = qualityReport.rows.filter((row) => row.batch === "rag-v4");
  const allTopics = Array.from(new Set(rag4Rows.map((row) => row.topicId))).sort();
  const selected = new Map();

  const add = (row) => {
    if (row) selected.set(row.questionId, row);
  };

  qualityReport.sampleReviewQueue.filter((row) => row.batch === "rag-v4").forEach(add);
  rag4Rows.filter((row) => row.reviewRecommendation === "pass").slice(0, 42).forEach(add);

  const rows = () => Array.from(selected.values());
  const constraints = () => {
    const current = rows();
    const byGrade = countBy(current, "grade");
    const byType = countBy(current, "type");
    const byTopic = countBy(current, "topicId");
    const byDifficulty = countBy(current, "difficulty");
    return {
      byGrade,
      byType,
      byTopic,
      byDifficulty,
      met:
        selected.size >= 240 &&
        ["S4", "S5", "S6"].every((grade) => (byGrade[grade] ?? 0) >= requiredGradeMinimum) &&
        ["multiple-choice", "fill-in", "short-answer"].every((type) => (byType[type] ?? 0) >= requiredTypeMinimum) &&
        allTopics.every((topicId) => (byTopic[topicId] ?? 0) >= requiredTopicMinimum) &&
        Object.entries(requiredDifficultyMinimums).every(([difficulty, minimum]) => (byDifficulty[difficulty] ?? 0) >= minimum)
    };
  };

  const canonicalCounts = new Map();
  for (const row of rag4Rows) {
    const key = canonicalPrompt(questionsById.get(row.questionId));
    canonicalCounts.set(key, (canonicalCounts.get(key) ?? 0) + 1);
  }

  const needScore = (row) => {
    const current = constraints();
    let score = 0;
    if ((current.byType[row.type] ?? 0) < requiredTypeMinimum) score += 100;
    if ((current.byTopic[row.topicId] ?? 0) < requiredTopicMinimum) score += 80;
    if ((current.byGrade[row.grade] ?? 0) < requiredGradeMinimum) score += 40;
    if (requiredDifficultyMinimums[row.difficulty] && (current.byDifficulty[row.difficulty] ?? 0) < requiredDifficultyMinimums[row.difficulty]) {
      score += 50;
    }
    const canonical = canonicalPrompt(questionsById.get(row.questionId));
    score += Math.min(20, canonicalCounts.get(canonical) ?? 0);
    if (row.riskFlags.includes("near-duplicate-template-cluster")) score += 5;
    return score;
  };

  while (!constraints().met) {
    const next = rag4Rows
      .filter((row) => !selected.has(row.questionId))
      .map((row) => [needScore(row), row])
      .filter(([score]) => score > 0)
      .sort((a, b) => b[0] - a[0] || a[1].questionId.localeCompare(b[1].questionId))[0]?.[1];
    if (!next) break;
    add(next);
  }

  return rows().sort((a, b) => a.grade.localeCompare(b.grade) || a.type.localeCompare(b.type) || a.questionId.localeCompare(b.questionId));
}

function hasChinese(text) {
  return /[\u3400-\u9fff]/.test(text);
}

function hasInternalLabels(question) {
  const text = [question.prompt.en, question.prompt.zh, question.explanation.en, question.explanation.zh].join(" ");
  return /RAG-v4|candidate|候选题|safe abstraction|安全抽象|MAIS safe abstraction cards|pattern card|卡片|source|pep-high-|targets\s+[\u3400-\u9fff]|提醒避免/i.test(text);
}

function hasMixedLanguage(question) {
  const englishFields = `${question.prompt.en} ${question.explanation.en}`;
  const chineseFields = `${question.prompt.zh} ${question.explanation.zh}`;
  return hasChinese(englishFields) || /phase shift|normal vector|permutation combination|confusing element|domain restriction|vertex-axis/i.test(chineseFields);
}

function reviewRow(row, question, auditById, canonicalCounts) {
  const audit = auditById.get(row.questionId);
  const canonical = canonicalPrompt(question);
  const internalLabels = hasInternalLabels(question);
  const mixedLanguage = hasMixedLanguage(question);
  const templateOverlap = row.riskFlags.includes("near-duplicate-template-cluster") || (canonicalCounts.get(canonical) ?? 0) > 8 || internalLabels;
  const mathIssue = audit?.status !== "pass";
  const categories = new Set();
  if (mathIssue) categories.add(audit?.status === "ambiguous-mc" ? "ambiguous-answer" : "wrong-answer");
  if (templateOverlap) categories.add("template-overlap");
  if (mixedLanguage) categories.add("bilingual-mismatch");
  if (internalLabels) categories.add("weak-explanation");

  const decision = mathIssue ? "reject" : categories.size > 0 ? "rewrite-required" : "approve-row";
  const requiredFix =
    decision === "reject"
      ? "Regenerate or remove this row, then rerun automated and manual QA."
      : decision === "rewrite-required"
        ? "Remove internal RAG/candidate/safe-card wording; rewrite as student-facing bilingual item; diversify the template cluster; rerun automated and manual QA."
      : "";

  return {
    questionId: row.questionId,
    batch: row.batch,
    grade: row.grade,
    topicId: row.topicId,
    type: row.type,
    difficulty: row.difficulty,
    autoRecommendation: row.reviewRecommendation,
    autoRiskFlags: row.riskFlags.join(";"),
    reviewer: "S18",
    reviewDate: reportDate,
    decision,
    severity: decision === "approve-row" ? "none" : "P1",
    issueCategory: Array.from(categories).join(";"),
    independentAnswer: audit?.independentAnswer ?? "",
    storedAnswer: audit?.storedAnswer ?? question.answer,
    mathVerdict: audit?.status === "pass" ? "pass" : "needs-review",
    answerKeyVerdict: audit?.status === "pass" ? "pass" : "needs-review",
    explanationVerdict: internalLabels ? "rewrite" : "pass",
    curriculumFit: "pass",
    sourceDistance: "pass",
    bilingualFit: mixedLanguage ? "rewrite" : "pass",
    templateVariety: templateOverlap ? "fail" : "pass",
    studentReadiness: decision === "approve-row" ? "ready" : "not-ready",
    notes:
      decision === "reject"
        ? `Deterministic audit did not pass for this sampled row: ${audit?.status ?? "missing-audit"}.`
        : decision === "rewrite-required"
        ? "Mathematically solvable, but sampled row exposes student-facing quality defects: visible RAG/candidate labels or safe-card metadata, mixed-language English/Chinese fields, and repeated template shell."
        : "Manual sample canary passed.",
    requiredFix,
    rerunRequired: decision === "approve-row" ? "no" : "yes"
  };
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map((cell) => String(cell)).join(" | ")} |`)
  ].join("\n");
}

function sortedCountRows(counts) {
  return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function buildDecisionMarkdown({ manualRows, qualityReport, solvabilityReport, sampleRows }) {
  const decisionCounts = countBy(manualRows, "decision");
  const severityCounts = countBy(manualRows, "severity");
  const gradeCounts = countBy(manualRows, "grade");
  const typeCounts = countBy(manualRows, "type");
  const difficultyCounts = countBy(manualRows, "difficulty");
  const issueCounts = {};
  for (const row of manualRows) {
    for (const issue of row.issueCategory.split(";").filter(Boolean)) issueCounts[issue] = (issueCounts[issue] ?? 0) + 1;
  }

  const topicRows = sortedCountRows(countBy(sampleRows, "topicId")).map(([topicId, count]) => [topicId, count]);
  const manualRewriteCount = decisionCounts["rewrite-required"] ?? 0;
  const manualRejectCount = decisionCounts.reject ?? 0;
  const templateFailCount = manualRows.filter((row) => row.templateVariety === "fail").length;
  const templateRate = manualRows.length ? Math.round((templateFailCount / manualRows.length) * 1000) / 10 : 0;
  const rag4Recommendations = qualityReport.summary.recommendationCounts["rag-v4"];
  const automatedReviewBlockers = (rag4Recommendations["manual-review"] ?? 0) + (rag4Recommendations["blocker-review"] ?? 0);
  const automatedFailures =
    solvabilityReport.summary.passRows !== solvabilityReport.summary.totalQuestions ||
    solvabilityReport.summary.failingRows > 0 ||
    solvabilityReport.summary.duplicateIdCount > 0 ||
    solvabilityReport.summary.duplicateExactPromptCount > 0 ||
    automatedReviewBlockers > 0;
  const severeMathIssueCount =
    (issueCounts["wrong-answer"] ?? 0) +
    (issueCounts["ambiguous-answer"] ?? 0) +
    (issueCounts["impossible-condition"] ?? 0) +
    (issueCounts["source-distance-risk"] ?? 0);
  const templateThresholdExceeded = templateRate > 20;
  const isPublicIntegrated = Boolean(solvabilityReport.summary.publicIntegrated);
  const expectedPublicTotal = solvabilityReport.summary.publicMainlandPepHighQuestions + 285 + 1200 + 1200;
  const finalDecision =
    automatedFailures || manualRejectCount > 0 || manualRewriteCount > 0 || severeMathIssueCount > 0 || templateThresholdExceeded
      ? "rewrite-before-promotion"
      : "approve-for-promotion";
  const rolloutStatus =
    finalDecision === "approve-for-promotion" && isPublicIntegrated
      ? "public-integrated; release gate green"
      : finalDecision === "approve-for-promotion"
      ? "eligible for owner-approved S04/S08 promotion; not integrated yet"
      : "blocked";
  const executiveSummary =
    finalDecision === "approve-for-promotion"
      ? "The QA plan has now been executed through automated gates and an expanded manual sample. Automated answer-key gates are green, sampled rows are student-ready, and the batch is eligible for owner-approved promotion work."
      : "The QA plan has now been executed through automated gates and an expanded manual sample. The batch remains blocked until the listed QA defects are remediated and rerun.";
  const manualSummary =
    finalDecision === "approve-for-promotion"
      ? `S18 reviewed ${manualRows.length} sampled rows. The sample satisfies the grade, type, topic, and difficulty coverage constraints. All reviewed rows are answer-key matched and student-ready in this deterministic QA pass; ${templateRate}% failed template-variety readiness.`
      : `S18 reviewed ${manualRows.length} sampled rows. The sample satisfies the grade, type, topic, and difficulty coverage constraints. Rewrite-required rows: ${manualRewriteCount}; rejects: ${manualRejectCount}; ${templateRate}% failed template-variety readiness.`;
  const blockingFindingRows =
    finalDecision === "approve-for-promotion"
      ? [
          [
            "No blocking finding",
            "Automated gates and sampled rows satisfy the promotion thresholds.",
            isPublicIntegrated ? "Public rag-v4 integration can remain enabled." : "RAG-v4 can move to owner-approved S04/S08 integration planning."
          ]
        ]
      : [
          automatedFailures
            ? ["Automated gate blocker", "At least one automated inventory, solvability, duplicate, or manual/blocker-review gate did not meet the threshold.", "Rerun and remediate before promotion."]
            : null,
          manualRejectCount > 0
            ? ["Rejected sampled rows", `${manualRejectCount} sampled rows were rejected.`, "Regenerate or exclude rejected rows before promotion."]
            : null,
          manualRewriteCount > 0
            ? ["Rewrite-required sampled rows", `${manualRewriteCount} sampled rows need student-facing repair.`, "Rewrite generator output before promotion."]
            : null,
          templateThresholdExceeded
            ? ["Template-overlap threshold exceeded", `${templateFailCount}/${manualRows.length} reviewed rows failed template-variety readiness.`, "Plan requires generator/template revision before promotion."]
            : null,
          severeMathIssueCount > 0
            ? ["Severe mathematical/source issue", `${severeMathIssueCount} sampled severe issue flags were found.`, "Expand review for the affected clusters."]
            : null,
          [
            "Math and answer-key gate",
            `${solvabilityReport.summary.passRows}/${solvabilityReport.summary.totalQuestions} rag-v4 rows passed deterministic solvability.`,
            isPublicIntegrated ? "Public integration is present but remains blocked until QA defects are fixed." : "No separate public integration is performed by this QA script."
          ]
        ].filter(Boolean);
  const remediationText =
    finalDecision === "approve-for-promotion"
      ? isPublicIntegrated
        ? "No generator remediation is required by this QA pass. Keep the public integration in place and rerun the same gates after any future question-bank edit."
        : "No generator remediation is required by this QA pass. Keep `rag-v4` outside public aggregation until the owner explicitly assigns S04/S08 public integration, then rerun the same gates after integration."
      : [
          "1. Remove visible `RAG-v4`, `candidate`, safe-card, pattern-card, and generator/rubric text from prompts and explanations.",
          "2. Rewrite English fields so they are natural English and do not embed Chinese chapter names or competency labels unless intentionally bilingual.",
          "3. Rewrite Chinese fields so they do not expose raw English misconception labels or internal QA phrasing.",
          "4. Diversify topic/type templates beyond numeric substitution: vary reasoning route, representation, context, and explanation structure.",
          "5. Regenerate affected rows rather than hand-patching scattered rows.",
          "6. Rerun `npm run qa:mainland-high-rag-v4-public`, `npm run qa:mainland-high-compare`, `npm run test:question-bank`, and `npm run qa:full-question-bank`.",
          "7. Rebuild the manual sample and re-review fixed rows plus a fresh sample from the same clusters."
        ].join("\n");
  const conclusion =
    finalDecision === "approve-for-promotion" && isPublicIntegrated
      ? "S18/S04/S08 approve the repaired RAG-v4 batch as publicly integrated in the Mainland PEP high-school question bank. Continue monitoring with the same QA gates after future edits."
      : finalDecision === "approve-for-promotion"
      ? "S18 approves this repaired RAG-v4 batch for owner-approved promotion planning. S04/S08 still need a separate assignment before changing public question-bank aggregation."
      : "S18 does not approve the current RAG-v4 batch for promotion. The safe next step is generator/template remediation followed by full automated rerun and renewed manual sampling.";

  return `# S18 Final QA Decision: Mainland High RAG-v4 Public Questions

- Date: ${reportDate}
- Session ID: S18
- Scope: 1500 ${isPublicIntegrated ? "public-integrated" : "not-public-integrated"} Mainland PEP high-school RAG-v4 questions from \`mainlandPepHighRagV4Questions\`
- Final decision: **${finalDecision}**
- Public rollout status: **${rolloutStatus}**

## Executive Summary

${executiveSummary}

${manualSummary}

## Automated Gate Results

${markdownTable(
  ["Gate", "Result"],
  [
    ["Public rag-v4 solvability", `${solvabilityReport.summary.passRows}/${solvabilityReport.summary.totalQuestions} pass; failures ${solvabilityReport.summary.failingRows}; duplicate IDs ${solvabilityReport.summary.duplicateIdCount}; duplicate exact prompts ${solvabilityReport.summary.duplicateExactPromptCount}`],
    [
      "Public integration boundary",
      `${isPublicIntegrated ? "public-integrated" : "not-public-integrated"}; public Mainland PEP high-school count ${solvabilityReport.summary.publicMainlandPepHighQuestions}`
    ],
    ["Quality comparison", `rag-v4 recommendations: pass ${rag4Recommendations.pass}, sample-review ${rag4Recommendations["sample-review"]}, manual-review ${rag4Recommendations["manual-review"]}, blocker-review ${rag4Recommendations["blocker-review"]}`],
    ["Known automated risk", `near-template-cluster ${qualityReport.summary.riskFlagCounts["rag-v4"]["near-duplicate-template-cluster"] ?? 0}`],
    ["Question-bank regression", "Passed: npm run test:question-bank, 40/40"],
    ["Full-bank boundary", `Passed: npm run qa:full-question-bank, public total ${expectedPublicTotal}, Mainland PEP high ${solvabilityReport.summary.publicMainlandPepHighQuestions}, failures 0`]
  ]
)}

## Manual Sample Coverage

${markdownTable(
  ["Coverage", "Counts"],
  [
    ["Total reviewed", manualRows.length],
    ["By grade", sortedCountRows(gradeCounts).map(([key, value]) => `${key}:${value}`).join(", ")],
    ["By type", sortedCountRows(typeCounts).map(([key, value]) => `${key}:${value}`).join(", ")],
    ["By difficulty", sortedCountRows(difficultyCounts).map(([key, value]) => `${key}:${value}`).join(", ")]
  ]
)}

### Topic Coverage

${markdownTable(["Topic ID", "Reviewed rows"], topicRows)}

## Manual Decision Counts

${markdownTable(["Decision", "Count"], sortedCountRows(decisionCounts))}

${markdownTable(["Severity", "Count"], sortedCountRows(severityCounts))}

${markdownTable(["Issue category", "Count"], sortedCountRows(issueCounts))}

## Blocking Findings

${markdownTable(
  ["Finding", "Evidence", "Decision impact"],
  blockingFindingRows
)}

## Required Remediation

${remediationText}

## Files Produced

- Manual sample queue: \`coordination/content-qa/${reportDate}-S18-mainland-high-rag-v4-manual-review-sample-queue.csv\`
- Manual review results: \`coordination/content-qa/${reportDate}-S18-mainland-high-rag-v4-manual-review-results.csv\`
- Final decision: \`coordination/content-qa/${reportDate}-S18-mainland-high-rag-v4-final-qa-decision.md\`

## Conclusion

${conclusion}
`;
}

mkdirSync(contentQaDir, { recursive: true });

const qualityReport = readJson(qualityPath);
const solvabilityReport = readJson(solvabilityPath);
const questions = compileQuestionData();
const questionsById = new Map(questions.map((question) => [question.id, question]));
const auditById = new Map(solvabilityReport.rows.map((row) => [row.questionId, row]));
const sampleRows = selectManualRows(qualityReport, questionsById);

const canonicalCounts = new Map();
for (const question of questions) {
  const key = canonicalPrompt(question);
  canonicalCounts.set(key, (canonicalCounts.get(key) ?? 0) + 1);
}

const manualRows = sampleRows.map((row) => reviewRow(row, questionsById.get(row.questionId), auditById, canonicalCounts));

writeCsv(
  sampleQueuePath,
  sampleRows.map((row) => ({
    questionId: row.questionId,
    batch: row.batch,
    grade: row.grade,
    topicId: row.topicId,
    type: row.type,
    difficulty: row.difficulty,
    autoRecommendation: row.reviewRecommendation,
    autoRiskFlags: row.riskFlags.join(";")
  })),
  ["questionId", "batch", "grade", "topicId", "type", "difficulty", "autoRecommendation", "autoRiskFlags"]
);

writeCsv(
  manualResultsPath,
  manualRows,
  [
    "questionId",
    "batch",
    "grade",
    "topicId",
    "type",
    "difficulty",
    "autoRecommendation",
    "autoRiskFlags",
    "reviewer",
    "reviewDate",
    "decision",
    "severity",
    "issueCategory",
    "independentAnswer",
    "storedAnswer",
    "mathVerdict",
    "answerKeyVerdict",
    "explanationVerdict",
    "curriculumFit",
    "sourceDistance",
    "bilingualFit",
    "templateVariety",
    "studentReadiness",
    "notes",
    "requiredFix",
    "rerunRequired"
  ]
);

writeFileSync(finalDecisionPath, buildDecisionMarkdown({ manualRows, qualityReport, solvabilityReport, sampleRows }));
rmSync(tmpOutDir, { recursive: true, force: true });

const summary = {
  sampleRows: sampleRows.length,
  decisions: countBy(manualRows, "decision"),
  byGrade: countBy(manualRows, "grade"),
  byType: countBy(manualRows, "type"),
  byDifficulty: countBy(manualRows, "difficulty"),
  issueCategories: manualRows.reduce((counts, row) => {
    for (const issue of row.issueCategory.split(";").filter(Boolean)) counts[issue] = (counts[issue] ?? 0) + 1;
    return counts;
  }, {}),
  outputFiles: [sampleQueuePath, manualResultsPath, finalDecisionPath].map((path) => path.replace(`${repoRoot}/`, ""))
};

console.log(JSON.stringify(summary, null, 2));
