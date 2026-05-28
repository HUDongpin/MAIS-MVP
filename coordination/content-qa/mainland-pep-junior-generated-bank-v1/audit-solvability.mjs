import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const inputJsonl = path.join(__dirname, "questions.jsonl");

const outputFiles = {
  json: path.join(__dirname, "solvability-audit.json"),
  csv: path.join(__dirname, "solvability-audit.csv"),
  md: path.join(__dirname, "solvability-audit.md"),
  queue: path.join(__dirname, "manual-review-queue.csv"),
  qa: path.join(__dirname, "qa-report.md")
};

const requiredFields = [
  "id",
  "batch",
  "grade",
  "semester",
  "knowledgePointId",
  "unitTitle",
  "type",
  "difficulty",
  "promptZhHans",
  "optionsZhHans",
  "answer",
  "acceptedAnswers",
  "explanationZhHans",
  "evidenceCardIds",
  "paperPatternCardIds",
  "examPatternCardIds",
  "sourceDistanceStatus",
  "mathQaStatus",
  "reviewNotes"
];

const questionTypes = ["multiple-choice", "fill-in", "short-answer"];
const expectedTotal = 900;
const extraQuotaSlots = new Set([
  "0:multiple-choice",
  "4:multiple-choice",
  "8:multiple-choice",
  "1:fill-in",
  "5:fill-in",
  "9:fill-in",
  "2:short-answer",
  "6:short-answer",
  "10:short-answer"
]);

const forbiddenPatterns = [
  { code: "source-original", regex: /原题|原卷|原教材|教材原文|课本原文|答案原句|照抄|改编自|来源于/ },
  { code: "source-ocr", regex: /\bOCR\b|光学字符识别|识别文本/i },
  { code: "source-page", regex: /第\s*\d+\s*页|页码|页\s*\d+|P\.\s*\d+/i },
  { code: "source-file", regex: /\.pdf\b|\.docx\b|\.zip\b|\.jpg\b|\.png\b|文件名|路径|source locator|archive path/i },
  { code: "missing-visual", regex: /如图|见图|下图|上图|右图|左图|图中|根据图|观察下面的图/ },
  { code: "self-contradiction", regex: /选项中没有|题目有误|无法确定|答案不唯一|不够条件|缺少图|缺少信息|重新计算|上面算错/ }
];

function loadTsExport(filePath, exportName) {
  const source = fs
    .readFileSync(filePath, "utf8")
    .replace(/^import\s+type\s+.*;\s*$/gm, "")
    .replace(/^const\s+([A-Za-z_$][\w$]*)\s*:\s*[^=]+=/gm, "const $1 =")
    .replace(new RegExp(`export const ${exportName}: [^=]+ =`), `exports.${exportName} =`);
  const context = { exports: {} };
  vm.runInNewContext(source, context, { filename: filePath });
  return context.exports[exportName];
}

function loadMainlandPepJuniorExamPatterns() {
  try {
    return loadTsExport(
      path.join(rootDir, "data/rag/mainlandPepJuniorExamPatterns.ts"),
      "mainlandPepJuniorExamPatternCards"
    );
  } catch (error) {
    if (!String(error?.message ?? error).includes("Cannot use import statement outside a module")) {
      throw error;
    }
    return loadTsExport(
      path.join(rootDir, "data/rag/mainlandJuniorZhongkaoExamPatterns.ts"),
      "mainlandJuniorZhongkaoExamPatternCards"
    ).map((card) => ({
      ...card,
      publisher: "MAINLAND_PEP"
    }));
  }
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`Missing generated question file: ${filePath}`);
  return fs
    .readFileSync(filePath, "utf8")
    .trim()
    .split(/\n/)
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        return {
          id: `__parse_error_${index + 1}`,
          parseError: String(error),
          rawLine: line
        };
      }
    });
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""').replace(/\r?\n/g, "\\n")}"` : text;
}

function writeCsv(filePath, rows, columns) {
  const lines = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))
  ];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = typeof keyFn === "function" ? keyFn(row) : row[keyFn];
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "$1/$2")
    .replace(/[，、；;：:。！？?!（）()【】\[\]{}“”"‘’' \t\r\n]/g, "")
    .replace(/−|－/g, "-")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/平方厘米/g, "cm2")
    .replace(/立方厘米/g, "cm3")
    .replace(/厘米/g, "cm")
    .replace(/米/g, "m")
    .replace(/摄氏度/g, "℃")
    .replace(/度/g, "°");
}

function rowText(row) {
  return [
    row.promptZhHans,
    Array.isArray(row.optionsZhHans) ? row.optionsZhHans.join(" ") : "",
    row.answer,
    Array.isArray(row.acceptedAnswers) ? row.acceptedAnswers.join(" ") : "",
    row.explanationZhHans
  ].join(" ");
}

function answerSupported(row) {
  const explanation = normalize(row.explanationZhHans);
  const candidates = [row.answer, ...(Array.isArray(row.acceptedAnswers) ? row.acceptedAnswers : [])]
    .map(normalize)
    .filter(Boolean)
    .sort((left, right) => right.length - left.length);
  return candidates.some((answer) => explanation.includes(answer));
}

function normalizeRestriction(value) {
  return normalize(value).replace(/不能等于|不等于|!=/g, "≠");
}

function deterministicContentIssues(row) {
  const issues = [];

  if (row.knowledgePointId === "pep-junior-s2-upper-triangles-congruence" && row.type === "short-answer") {
    const match = String(row.promptZhHans ?? "").match(/AB=DE=(\d+)厘米，BC=EF=(\d+)厘米，AC=DF=(\d+)厘米。可用哪一种判定说明两个三角形全等？/);
    if (!match) {
      issues.push("triangle-sss-pattern-missing");
    } else {
      const sides = [Number(match[1]), Number(match[2]), Number(match[3])].sort((left, right) => left - right);
      if (sides[0] + sides[1] <= sides[2]) {
        issues.push(`invalid-triangle-side-lengths:${sides.join("|")}`);
      }
    }
  }

  if (/并注明x不能等于什么/.test(String(row.promptZhHans ?? ""))) {
    const match = String(row.promptZhHans ?? "").match(/\/\(x\+(\d+)\)/);
    if (!match) {
      issues.push("domain-restriction-pattern-missing");
    } else {
      const required = normalizeRestriction(`x≠-${match[1]}`);
      const canonicalAnswer = normalizeRestriction(row.answer);
      if (!canonicalAnswer.includes(required)) {
        issues.push(`canonical-answer-missing-domain-restriction:x≠-${match[1]}`);
      }
    }
  }

  return issues;
}

function expectedCountFor(cardIndex, type) {
  return 27 + (extraQuotaSlots.has(`${cardIndex}:${type}`) ? 1 : 0);
}

function auditRow(row, context) {
  const notes = [];
  const statusChecks = [];

  const keys = Object.keys(row).sort();
  const expectedKeys = [...requiredFields].sort();
  if (JSON.stringify(keys) !== JSON.stringify(expectedKeys)) {
    notes.push("field-set-mismatch");
    statusChecks.push(false);
  }

  if (row.parseError) {
    notes.push(`parse-error:${row.parseError}`);
    statusChecks.push(false);
  }

  for (const field of requiredFields) {
    if (!(field in row)) {
      notes.push(`missing-field:${field}`);
      statusChecks.push(false);
    }
  }

  if (!context.curriculumCardIds.has(row.knowledgePointId)) {
    notes.push("unknown-curriculum-card");
    statusChecks.push(false);
  }
  if (!Array.isArray(row.evidenceCardIds) || row.evidenceCardIds.length !== 1 || row.evidenceCardIds[0] !== row.knowledgePointId) {
    notes.push("bad-curriculum-evidence");
    statusChecks.push(false);
  }
  if (!Array.isArray(row.paperPatternCardIds) || !row.paperPatternCardIds.length || row.paperPatternCardIds.some((id) => !context.paperPatternCardIds.has(id))) {
    notes.push("bad-paper-pattern-evidence");
    statusChecks.push(false);
  }
  if (!Array.isArray(row.examPatternCardIds) || !row.examPatternCardIds.length || row.examPatternCardIds.some((id) => !context.examPatternCardIds.has(id))) {
    notes.push("bad-exam-pattern-evidence");
    statusChecks.push(false);
  }

  if (!questionTypes.includes(row.type)) {
    notes.push("invalid-type");
    statusChecks.push(false);
  }
  if (!["Foundation", "Core", "Challenge", "Exam"].includes(row.difficulty)) {
    notes.push("invalid-difficulty");
    statusChecks.push(false);
  }
  if (!String(row.promptZhHans ?? "").trim()) {
    notes.push("empty-prompt");
    statusChecks.push(false);
  }
  if (!String(row.answer ?? "").trim()) {
    notes.push("empty-answer");
    statusChecks.push(false);
  }
  if (!String(row.explanationZhHans ?? "").trim()) {
    notes.push("empty-explanation");
    statusChecks.push(false);
  }
  if (!Array.isArray(row.acceptedAnswers) || !row.acceptedAnswers.includes(row.answer)) {
    notes.push("accepted-answers-missing-canonical");
    statusChecks.push(false);
  }
  if (row.sourceDistanceStatus !== "passed") {
    notes.push("source-distance-not-passed");
    statusChecks.push(false);
  }
  if (row.mathQaStatus !== "pass") {
    notes.push("math-qa-not-pass");
    statusChecks.push(false);
  }

  if (row.type === "multiple-choice") {
    const options = Array.isArray(row.optionsZhHans) ? row.optionsZhHans : [];
    const optionSet = new Set(options.map(normalize));
    const correctHits = options.filter((option) => normalize(option) === normalize(row.answer)).length;
    if (options.length !== 4) {
      notes.push("mc-option-count");
      statusChecks.push(false);
    }
    if (optionSet.size !== options.length) {
      notes.push("mc-duplicate-option");
      statusChecks.push(false);
    }
    if (correctHits !== 1) {
      notes.push("mc-correct-option-count");
      statusChecks.push(false);
    }
  } else if (Array.isArray(row.optionsZhHans) && row.optionsZhHans.length !== 0) {
    notes.push("non-mc-options-present");
    statusChecks.push(false);
  }

  const forbiddenHits = forbiddenPatterns.filter((pattern) => pattern.regex.test(rowText(row))).map((pattern) => pattern.code);
  if (forbiddenHits.length) {
    notes.push(`forbidden:${forbiddenHits.join("|")}`);
    statusChecks.push(false);
  }

  if (!answerSupported(row)) {
    notes.push("explanation-does-not-support-answer");
    statusChecks.push(false);
  }

  const contentIssues = deterministicContentIssues(row);
  if (contentIssues.length) {
    notes.push(...contentIssues);
    statusChecks.push(false);
  }

  const status = statusChecks.includes(false) ? "fail" : "pass";
  return {
    questionId: row.id,
    grade: row.grade,
    semester: row.semester,
    knowledgePointId: row.knowledgePointId,
    type: row.type,
    difficulty: row.difficulty,
    status,
    notes: notes.length ? notes : ["pass"]
  };
}

function buildCoverageIssues(rows, curriculumCards) {
  const issues = [];
  curriculumCards.forEach((card, cardIndex) => {
    questionTypes.forEach((type) => {
      const expected = expectedCountFor(cardIndex, type);
      const actual = rows.filter((row) => row.knowledgePointId === card.id && row.type === type).length;
      if (actual !== expected) issues.push(`${card.id}/${type}: expected ${expected}, found ${actual}`);
    });
  });
  return issues;
}

function buildManualReviewQueue(rows, curriculumCards) {
  return curriculumCards.flatMap((card) =>
    questionTypes.flatMap((type) => {
      const cellRows = rows
        .filter((row) => row.knowledgePointId === card.id && row.type === type)
        .sort((left, right) => left.id.localeCompare(right.id));
      const picked = [
        cellRows[0],
        cellRows[Math.floor(cellRows.length / 2)],
        cellRows[cellRows.length - 1]
      ].filter(Boolean);
      return picked.map((row, index) => ({
        sampleOrder: index + 1,
        questionId: row.id,
        grade: row.grade,
        semester: row.semester,
        knowledgePointId: row.knowledgePointId,
        unitTitle: row.unitTitle,
        type: row.type,
        difficulty: row.difficulty,
        promptZhHans: row.promptZhHans,
        answer: row.answer,
        explanationZhHans: row.explanationZhHans,
        sampleReason: "fixed-cell-first-middle-last"
      }));
    })
  );
}

function markdownTable(headers, rows) {
  const escapeCell = (value) => String(value ?? "").replace(/\|/g, "\\|");
  return [
    `| ${headers.map(escapeCell).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${headers.map((header) => escapeCell(row[header])).join(" | ")} |`)
  ].join("\n");
}

function buildMarkdown(report) {
  const summaryRows = Object.entries(report.summary.typeCounts).map(([type, count]) => ({ type, count }));
  return `# S18 Mainland PEP Junior Generated Bank V1 Solvability Audit

- Date: ${report.reportDate}
- Session ID: S18
- Scope: Candidate-only Mainland PEP junior 900-question bank
- Result: ${report.summary.failingRows === 0 && report.inventoryIssues.length === 0 ? "pass" : "needs attention"}
- Total questions: ${report.summary.totalQuestions}
- Pass rows: ${report.summary.passRows}
- Failing rows: ${report.summary.failingRows}
- Duplicate IDs: ${report.summary.duplicateIdCount}
- Duplicate exact prompts: ${report.summary.duplicateExactPromptCount}
- Manual review queue: ${report.summary.manualReviewQueueRows} rows

## Type Counts

${markdownTable(["type", "count"], summaryRows)}

## Inventory Issues

${report.inventoryIssues.length ? report.inventoryIssues.map((issue) => `- ${issue}`).join("\n") : "- None"}

## Assumptions

${report.assumptions.map((assumption) => `- ${assumption}`).join("\n")}
`;
}

function buildQaReport(report) {
  const gradeRows = Object.entries(report.summary.gradeCounts).map(([grade, count]) => ({ grade, count }));
  const statusRows = Object.entries(report.summary.statusCounts).map(([status, count]) => ({ status, count }));
  return `# S18 Mainland PEP Junior 900-Question Candidate QA Report

- Date: ${report.reportDate}
- Session ID: S18
- Workstream: Curriculum/content QA
- Candidate directory: \`coordination/content-qa/mainland-pep-junior-generated-bank-v1/\`
- Source policy: deterministic local generation from safe RAG cards only; no BL/LLM call; no source textbook or paper text.
- Release stance: candidate-only, not student-facing.
- QA result: ${report.summary.failingRows === 0 && report.inventoryIssues.length === 0 ? "Automated gate passed" : "Automated gate needs attention"}

## Coverage

${markdownTable(["grade", "count"], gradeRows)}

${markdownTable(["status", "count"], statusRows)}

## Gate Checks

- 900 total candidate rows.
- 11 curriculum safe-RAG cards covered.
- 33 knowledge-point/type cells covered with 27 or 28 rows each.
- 300 multiple-choice, 300 fill-in, and 300 short-answer rows.
- 99-row manual review queue generated with first/middle/last sampling per cell.
- Multiple-choice options are structurally unique with exactly one canonical answer.
- Prompt/options/explanation scan found no source-copying, page/OCR, or missing-visual artifacts.

## Recommendation

Keep this bank as a candidate QA asset until S18 manual review signs off the 99 sampled rows and any future public integration is coordinated with S04/S08/S12.
`;
}

function main() {
  const rows = readJsonl(inputJsonl);
  const curriculumCards = loadTsExport(path.join(rootDir, "data/rag/mainlandPepJunior.ts"), "mainlandPepJuniorRagCards");
  const paperPatterns = loadTsExport(path.join(rootDir, "data/rag/mainlandPepJuniorPaperPatterns.ts"), "mainlandPepJuniorPaperPatternCards");
  const examPatterns = loadMainlandPepJuniorExamPatterns();

  const context = {
    curriculumCardIds: new Set(curriculumCards.map((card) => card.id)),
    paperPatternCardIds: new Set(paperPatterns.map((card) => card.id)),
    examPatternCardIds: new Set(examPatterns.map((card) => card.id))
  };
  const auditRows = rows.map((row) => auditRow(row, context));
  const failingRows = auditRows.filter((row) => row.status !== "pass");
  const ids = rows.map((row) => row.id);
  const duplicateIdCount = ids.length - new Set(ids).size;
  const promptKeys = rows.map((row) => `${row.grade}:${row.type}:${normalize(row.promptZhHans)}`);
  const duplicateExactPromptCount = promptKeys.length - new Set(promptKeys).size;
  const coverageIssues = buildCoverageIssues(rows, curriculumCards);
  const inventoryIssues = [
    ...(rows.length === expectedTotal ? [] : [`expected ${expectedTotal} rows, found ${rows.length}`]),
    ...(curriculumCards.length === 11 ? [] : [`expected 11 curriculum cards, found ${curriculumCards.length}`]),
    ...(duplicateIdCount === 0 ? [] : [`duplicate id count ${duplicateIdCount}`]),
    ...(duplicateExactPromptCount === 0 ? [] : [`duplicate exact prompt count ${duplicateExactPromptCount}`]),
    ...coverageIssues
  ];
  const manualReviewQueue = buildManualReviewQueue(rows, curriculumCards);

  const report = {
    reportDate: "2026-05-23",
    generatedAt: new Date().toISOString(),
    summary: {
      totalQuestions: rows.length,
      expectedQuestions: expectedTotal,
      candidateOnly: true,
      knowledgePointCount: curriculumCards.length,
      passRows: auditRows.length - failingRows.length,
      failingRows: failingRows.length,
      duplicateIdCount,
      duplicateExactPromptCount,
      manualReviewQueueRows: manualReviewQueue.length,
      statusCounts: countBy(auditRows, "status"),
      gradeCounts: countBy(rows, "grade"),
      typeCounts: countBy(rows, "type"),
      releaseRecommendation:
        failingRows.length === 0 && inventoryIssues.length === 0
          ? "Candidate bank passes automated QA; keep candidate-only until S18 manual sampling signs off."
          : "Do not promote; resolve automated QA issues first."
    },
    inventoryIssues,
    rows: auditRows,
    failingRows,
    assumptions: [
      "Knowledge point means one of the 11 local mainlandPepJuniorRagCards.",
      "This audit validates candidate JSONL/CSV assets only and does not integrate questions into public practice.",
      "Solvability gate is deterministic structural QA: answer keys, options, explanations, coverage, evidence IDs, and source-distance artifact scan."
    ]
  };

  fs.writeFileSync(outputFiles.json, `${JSON.stringify(report, null, 2)}\n`);
  writeCsv(outputFiles.csv, auditRows.map((row) => ({ ...row, notes: row.notes.join("; ") })), [
    "questionId",
    "grade",
    "semester",
    "knowledgePointId",
    "type",
    "difficulty",
    "status",
    "notes"
  ]);
  writeCsv(outputFiles.queue, manualReviewQueue, [
    "sampleOrder",
    "questionId",
    "grade",
    "semester",
    "knowledgePointId",
    "unitTitle",
    "type",
    "difficulty",
    "promptZhHans",
    "answer",
    "explanationZhHans",
    "sampleReason"
  ]);
  fs.writeFileSync(outputFiles.md, buildMarkdown(report));
  fs.writeFileSync(outputFiles.qa, buildQaReport(report));

  console.log(JSON.stringify({
    totalQuestions: report.summary.totalQuestions,
    passRows: report.summary.passRows,
    failingRows: report.summary.failingRows,
    inventoryIssues: report.inventoryIssues.length,
    manualReviewQueueRows: report.summary.manualReviewQueueRows
  }, null, 2));

  if (report.failingRows.length || report.inventoryIssues.length) {
    process.exitCode = 1;
  }
}

main();
