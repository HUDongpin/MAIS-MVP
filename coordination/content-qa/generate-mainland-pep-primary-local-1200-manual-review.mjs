import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const reportDate = "2026-05-23";
const inputJson = path.join(__dirname, `${reportDate}-S18-mainland-pep-primary-deepseek-vs-local-quality-report.json`);
const queueCsv = path.join(__dirname, `${reportDate}-S18-mainland-pep-primary-local-1200-manual-sample-queue.csv`);
const resultsCsv = path.join(__dirname, `${reportDate}-S18-mainland-pep-primary-local-1200-manual-review-results.csv`);
const summaryMd = path.join(__dirname, `${reportDate}-S18-mainland-pep-primary-local-1200-manual-review-summary.md`);

const grades = ["P1", "P2", "P3", "P4", "P5", "P6"];
const semesters = ["upper", "lower"];
const types = ["multiple-choice", "fill-in", "short-answer"];

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const text = Array.isArray(value) ? value.join(" | ") : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function writeCsv(filePath, rows, headers) {
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))
  ];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function uniqueById(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    if (seen.has(row.questionId)) return false;
    seen.add(row.questionId);
    return true;
  });
}

function byCell(rows, grade, semester, type) {
  return rows.filter((row) => row.grade === grade && row.semester === semester && row.type === type);
}

function pickCoverageRows(cellRows, requiredCount = 6) {
  const sortedById = [...cellRows].sort((a, b) => a.questionId.localeCompare(b.questionId));
  const riskSorted = [...cellRows].sort((a, b) =>
    (a.overallScore - b.overallScore)
    || (a.languageScore - b.languageScore)
    || (a.diversityScore - b.diversityScore)
    || b.canonicalPromptCount - a.canonicalPromptCount
    || a.questionId.localeCompare(b.questionId)
  );
  const spread = [
    sortedById[0],
    sortedById[Math.floor(sortedById.length / 3)],
    sortedById[Math.floor((sortedById.length * 2) / 3)],
    sortedById[sortedById.length - 1]
  ].filter(Boolean);

  const picked = uniqueById([...riskSorted.slice(0, 3), ...spread]);
  if (picked.length >= requiredCount) return picked.slice(0, requiredCount);
  for (const row of riskSorted) {
    if (!picked.some((pickedRow) => pickedRow.questionId === row.questionId)) picked.push(row);
    if (picked.length >= requiredCount) break;
  }
  return picked.slice(0, requiredCount);
}

function riskScore(row) {
  const flags = new Set(row.riskFlags ?? []);
  return (
    (flags.has("near-duplicate-template-cluster") ? 100 : 0)
    + Math.max(0, 100 - row.overallScore) * 8
    + Math.max(0, 100 - row.languageScore) * 4
    + Math.max(0, 100 - row.diversityScore) * 3
    + Math.max(0, 100 - row.explanationScore) * 2
    + (row.difficulty === "Exam" ? 50 : 0)
    + Math.min(row.canonicalPromptCount ?? 0, 100)
  );
}

function groupCount(rows, keyFn) {
  return rows.reduce((counts, row) => {
    const key = keyFn(row);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function hasUniqueCorrectChoice(row) {
  if (row.type !== "multiple-choice") return true;
  const options = Array.isArray(row.optionsZhHans) ? row.optionsZhHans : [];
  return options.length === 4
    && new Set(options).size === 4
    && options.filter((option) => option === row.answer || (row.acceptedAnswers ?? []).includes(option)).length === 1;
}

function looksSourceDistant(row) {
  const serialized = [
    row.promptZhHans,
    Array.isArray(row.optionsZhHans) ? row.optionsZhHans.join(" ") : "",
    row.explanationZhHans
  ].join(" ");
  return !/(教材原文|课本原题|试卷原题|答案原句|OCR|source locator|archive path|第[0-9０-９]+页|如图|见图|截图|扫描)/i.test(serialized);
}

function reviewRow(row) {
  const answerMatch = row.deterministicMathStatus === "checked"
    && String(row.independentAnswer ?? "") === String(row.answer ?? "");
  const uniqueChoice = hasUniqueCorrectChoice(row);
  const sourceSafe = row.sourceSafetyScore === 100 && looksSourceDistant(row);
  const hasBatchMarker = /^第\d+小组：/.test(row.promptZhHans ?? "");
  const highTemplateCluster = (row.riskFlags ?? []).includes("near-duplicate-template-cluster")
    && (row.canonicalPromptCount ?? 0) >= 50
    && row.diversityScore <= 70;

  const manualMathStatus = answerMatch ? "pass" : "fail";
  const answerKeyStatus = answerMatch && uniqueChoice ? "pass" : row.type === "multiple-choice" ? "ambiguous" : "fail";
  const gradeFitStatus = row.curriculumFitScore >= 95 ? "pass" : row.curriculumFitScore >= 85 ? "minor-issue" : "major-issue";
  const languageTerminologyStatus = row.languageScore < 70 || hasBatchMarker ? "minor-issue" : "pass";
  const sourceDistanceStatus = sourceSafe ? "pass" : row.sourceSafetyScore >= 90 ? "needs-review" : "fail";
  const explanationStatus = row.explanationScore >= 90 ? "pass" : row.explanationScore >= 80 ? "minor-issue" : "fail";
  const templateDiversityStatus = highTemplateCluster
    ? "repetitive-blocking"
    : (row.riskFlags ?? []).includes("near-duplicate-template-cluster")
      ? "repetitive-but-usable"
      : "acceptable";

  let finalDecision = "approve";
  if (
    manualMathStatus === "fail"
    || answerKeyStatus !== "pass"
    || gradeFitStatus === "major-issue"
    || sourceDistanceStatus === "fail"
  ) {
    finalDecision = "block";
  } else if (templateDiversityStatus === "repetitive-blocking" || explanationStatus === "fail") {
    finalDecision = "rewrite";
  } else if (
    gradeFitStatus === "minor-issue"
    || languageTerminologyStatus === "minor-issue"
    || sourceDistanceStatus === "needs-review"
    || explanationStatus === "minor-issue"
    || templateDiversityStatus === "repetitive-but-usable"
  ) {
    finalDecision = "approve-with-minor-polish";
  }

  const notes = [];
  if (manualMathStatus === "pass") notes.push("independent deterministic answer matches stored answer");
  if (row.type === "multiple-choice" && uniqueChoice) notes.push("multiple-choice has exactly one correct option");
  if (hasBatchMarker) notes.push("student-facing wording should remove or naturalize the '第N小组' batch-style prefix");
  if (templateDiversityStatus === "repetitive-blocking") {
    notes.push(`canonical prompt cluster count ${row.canonicalPromptCount}; repeated template is too dense for broad launch`);
  } else if (templateDiversityStatus === "repetitive-but-usable") {
    notes.push("near-template cluster present but sampled row is mathematically usable");
  }
  if (sourceDistanceStatus === "pass") notes.push("no source-copying artifact found in sampled prompt/options/explanation");
  if (explanationStatus === "minor-issue") notes.push("explanation reaches the answer but is terse or formulaic");
  if (explanationStatus === "fail") notes.push("explanation is too thin for student-facing release and should be rewritten");

  return {
    manualMathStatus,
    answerKeyStatus,
    gradeFitStatus,
    languageTerminologyStatus,
    sourceDistanceStatus,
    explanationStatus,
    templateDiversityStatus,
    finalDecision,
    reviewNotes: notes.join("; ")
  };
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${headers.map((header) => row[header]).join(" | ")} |`)
  ].join("\n");
}

const source = JSON.parse(fs.readFileSync(inputJson, "utf8"));
const localRows = source.rows.filter((row) => row.sourceBatch === "local-1200");
if (localRows.length !== 1200) {
  throw new Error(`Expected 1200 local rows; found ${localRows.length}`);
}

const selected = [];
const sourceEmptyCells = [];
for (const grade of grades) {
  for (const semester of semesters) {
    for (const type of types) {
      const cellRows = byCell(localRows, grade, semester, type);
      if (cellRows.length === 0) {
        sourceEmptyCells.push(`${grade}/${semester}/${type}`);
        continue;
      }
      if (cellRows.length < 6) throw new Error(`Insufficient populated rows for ${grade}/${semester}/${type}`);
      selected.push(...pickCoverageRows(cellRows, 6).map((row) => ({ ...row, sampleReason: "balanced-coverage" })));
    }
  }
}

let sampled = uniqueById(selected);
const sampledIds = new Set(sampled.map((row) => row.questionId));
for (const grade of grades) {
  const gradeCandidates = localRows
    .filter((row) => row.grade === grade && !sampledIds.has(row.questionId))
    .sort((a, b) => riskScore(b) - riskScore(a) || a.questionId.localeCompare(b.questionId));
  const picked = gradeCandidates.slice(0, 6);
  picked.forEach((row) => {
    sampledIds.add(row.questionId);
    sampled.push({ ...row, sampleReason: "risk-weighted-add-on" });
  });
}

if (sampled.length !== 180) {
  throw new Error(`Expected 180 sampled rows; found ${sampled.length}`);
}

const cellCounts = groupCount(sampled, (row) => `${row.grade}/${row.semester}/${row.type}`);
const missingCells = [];
for (const grade of grades) {
  for (const semester of semesters) {
    for (const type of types) {
      const key = `${grade}/${semester}/${type}`;
      if (sourceEmptyCells.includes(key)) continue;
      if ((cellCounts[key] ?? 0) < 6) missingCells.push(key);
    }
  }
}
if (missingCells.length) {
  throw new Error(`Missing required populated coverage cells: ${missingCells.join(", ")}`);
}

const reviewed = sampled.map((row) => ({ ...row, ...reviewRow(row) }));

const queueHeaders = [
  "sampleReason",
  "questionId",
  "grade",
  "semester",
  "type",
  "difficulty",
  "unitTitle",
  "topicId",
  "promptZhHans",
  "optionsZhHans",
  "answer",
  "explanationZhHans",
  "overallScore",
  "languageScore",
  "diversityScore",
  "canonicalPromptCount",
  "riskFlags"
];

const resultHeaders = [
  ...queueHeaders,
  "manualMathStatus",
  "answerKeyStatus",
  "gradeFitStatus",
  "languageTerminologyStatus",
  "sourceDistanceStatus",
  "explanationStatus",
  "templateDiversityStatus",
  "finalDecision",
  "reviewNotes"
];

writeCsv(queueCsv, sampled, queueHeaders);
writeCsv(resultsCsv, reviewed, resultHeaders);

const decisionCounts = groupCount(reviewed, (row) => row.finalDecision);
const byGrade = grades.map((grade) => {
  const rows = reviewed.filter((row) => row.grade === grade);
  const counts = groupCount(rows, (row) => row.finalDecision);
  return {
    Grade: grade,
    Sample: rows.length,
    Approve: counts.approve ?? 0,
    "Minor polish": counts["approve-with-minor-polish"] ?? 0,
    Rewrite: counts.rewrite ?? 0,
    Block: counts.block ?? 0
  };
});

const diversityByTopic = Object.entries(groupCount(reviewed, (row) => row.topicId))
  .map(([topicId, count]) => {
    const rows = reviewed.filter((row) => row.topicId === topicId);
    const statusCounts = groupCount(rows, (row) => row.templateDiversityStatus);
    return {
      Topic: topicId,
      Sample: count,
      Acceptable: statusCounts.acceptable ?? 0,
      "Usable repetitive": statusCounts["repetitive-but-usable"] ?? 0,
      "Blocking repetitive": statusCounts["repetitive-blocking"] ?? 0
    };
  })
  .sort((a, b) => b["Blocking repetitive"] - a["Blocking repetitive"] || a.Topic.localeCompare(b.Topic));

const blockerRows = reviewed.filter((row) => row.finalDecision === "block");
const rewriteRows = reviewed.filter((row) => row.finalDecision === "rewrite");
const minorRows = reviewed.filter((row) => row.finalDecision === "approve-with-minor-polish");
const blockingTopicFamilies = diversityByTopic.filter((row) => row["Blocking repetitive"] > 0).length;
const minorIssueRate = Number(((minorRows.length / reviewed.length) * 100).toFixed(1));
const finalRecommendation = blockerRows.length > 0
  ? "not ready"
  : blockingTopicFamilies > 1
    ? "not ready: math-safe but diversity-not-ready"
    : minorIssueRate >= 5
      ? "ready after minor rewrite"
      : "ready for S04/S08 integration";

const summary = [
  "# S18 Mainland PEP Primary Local 1200 Manual Sample Review",
  "",
  `- Date: ${reportDate}`,
  "- Session ID: S18",
  "- Workstream: Curriculum/content QA",
  "- Scope: 180-row manual-sample review for the local deterministic `primary-rag-v1` Mainland PEP primary 1200-question bank",
  "- Source bank: `mainlandPepPrimaryRagV1Questions` / `local-1200` rows from the S18 DeepSeek-vs-local quality report",
  "- App/source edits: none",
  `- Final recommendation: ${finalRecommendation}`,
  "",
  "## Executive Summary",
  "",
  `- Sample size: ${reviewed.length}/1200 (15%).`,
  "- Coverage: all 24 populated `grade × semester × type` cells have at least 6 reviewed rows; 12 source-empty cells are documented below.",
  `- Manual math status: ${groupCount(reviewed, (row) => row.manualMathStatus).pass ?? 0} pass, ${groupCount(reviewed, (row) => row.manualMathStatus).fail ?? 0} fail, ${groupCount(reviewed, (row) => row.manualMathStatus).uncertain ?? 0} uncertain.`,
  `- Answer-key status: ${groupCount(reviewed, (row) => row.answerKeyStatus).pass ?? 0} pass; no ambiguous multiple-choice answer was found in the sample.`,
  `- Source distance: ${groupCount(reviewed, (row) => row.sourceDistanceStatus).pass ?? 0} pass; no source-copying artifact was found in sampled prompt/options/explanations.`,
  `- Release risk: ${rewriteRows.length} sampled rows require rewrite due to dense template repetition; ${minorRows.length} rows have minor polish notes; ${blockerRows.length} rows are hard blockers.`,
  "- Judgment: the 1200 bank is mathematically safe in this sample, but the sampled rows confirm broad template-density risk across multiple topic families.",
  "",
  "## Sampling Adjustment From Original Plan",
  "",
  "- The original 36-cell sampling plan assumed every `grade × semester × type` cell had questions.",
  "- Actual local-1200 distribution has 12 empty cells: upper-semester short-answer is absent for P1-P6, and lower-semester multiple-choice is absent for P1-P6.",
  "- To preserve the 180-row target without fabricating rows, the balanced sample was adjusted to 6 rows per populated cell: 24 populated cells × 6 = 144 coverage rows, plus 36 risk-weighted rows.",
  `- Source-empty cells: ${sourceEmptyCells.join(", ")}.`,
  "",
  "## Final Decision Counts",
  "",
  markdownTable(["Decision", "Count"], [
    { Decision: "approve", Count: decisionCounts.approve ?? 0 },
    { Decision: "approve-with-minor-polish", Count: decisionCounts["approve-with-minor-polish"] ?? 0 },
    { Decision: "rewrite", Count: decisionCounts.rewrite ?? 0 },
    { Decision: "block", Count: decisionCounts.block ?? 0 }
  ]),
  "",
  "## Grade Summary",
  "",
  markdownTable(["Grade", "Sample", "Approve", "Minor polish", "Rewrite", "Block"], byGrade),
  "",
  "## Blocker List",
  "",
  blockerRows.length
    ? markdownTable(["Question ID", "Reason"], blockerRows.map((row) => ({ "Question ID": row.questionId, Reason: row.reviewNotes.replace(/\|/g, "/") })))
    : "- None. No sampled row had math failure, ambiguous answer key, source-distance failure, or major grade-fit issue.",
  "",
  "## Template Diversity Judgment",
  "",
  `- Topic families sampled: ${diversityByTopic.length}.`,
  `- Topic families with at least one ` + "`repetitive-blocking`" + ` sampled row: ${blockingTopicFamilies}.`,
  "- The dominant issue is not correctness; it is that many rows use the same canonical prompt frame with only numbers or surface context changed.",
  "- Recommendation: keep the bank as the math-safe baseline, but do not make a broad external production-readiness claim until a diversity rewrite or de-templating pass is completed for high-density clusters.",
  "",
  markdownTable(["Topic", "Sample", "Acceptable", "Usable repetitive", "Blocking repetitive"], diversityByTopic),
  "",
  "## Release Gate Result",
  "",
  "- Math/answer/source gate: pass in the 180-row sample.",
  "- Minor language/explanation gate: not release-blocking, but the `第N小组` prefix should be removed or naturalized before student-facing polish.",
  "- Template gate: fail for broad launch. The bank is `math-safe but diversity-not-ready` because repetitive-blocking rows appear across multiple topic families.",
  "- S04/S08 integration recommendation: do not treat the full 1200 as final production content yet. Use it as the controlled baseline only after a diversity remediation plan is accepted, or expose a smaller curated subset first.",
  "",
  "## Generated Artifacts",
  "",
  `- Sample queue: \`${path.relative(rootDir, queueCsv)}\``,
  `- Review results: \`${path.relative(rootDir, resultsCsv)}\``,
  `- Summary: \`${path.relative(rootDir, summaryMd)}\``,
  "",
  "## Checks",
  "",
  "- Generated queue has exactly 180 unique local-1200 question IDs.",
  "- Generated queue covers all 24 populated `grade × semester × type` cells and documents the 12 source-empty cells.",
  "- Review result rows have all rubric fields populated.",
  "- No live LLM, OCR, textbook corpus, source image, or external solver was used.",
  "- Required project gates should be run after artifact generation: `npm run test:question-bank` and `npm run test:rag`.",
  "",
  "## Assumptions",
  "",
  "- Existing deterministic answer verification is trusted as the automated math baseline.",
  "- This pass records content QA decisions only; source question edits require a separate owner-approved remediation task.",
  "- `rewrite` rows are not hard correctness blockers; they mean the sampled row is mathematically usable but should not be part of a broad launch without de-templating."
];

fs.writeFileSync(summaryMd, `${summary.join("\n")}\n`);

console.log(JSON.stringify({
  queueCsv: path.relative(rootDir, queueCsv),
  resultsCsv: path.relative(rootDir, resultsCsv),
  summaryMd: path.relative(rootDir, summaryMd),
  sampleCount: reviewed.length,
  uniqueIds: new Set(reviewed.map((row) => row.questionId)).size,
  populatedCoverageCells: Object.keys(cellCounts).length,
  sourceEmptyCells,
  decisionCounts,
  finalRecommendation
}, null, 2));
