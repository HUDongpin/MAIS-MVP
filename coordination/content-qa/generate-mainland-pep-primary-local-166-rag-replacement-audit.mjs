import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const compiledDir = path.join(rootDir, ".tmp", "mainland-pep-primary-166-replacement-audit");
const outputDir = path.join(rootDir, "coordination", "content-qa");
const reportDate = "2026-05-23";
const baseName = `${reportDate}-S18-mainland-pep-primary-local-166-rag-replacement`;

const forbiddenPatterns = [
  "教材原文",
  "原题",
  "答案原句",
  "官方解析",
  "OCR",
  "source locator",
  "archive path",
  "PDF",
  "DOCX",
  "safeSummary",
  "已修改",
  "修改选项",
  "可能题目",
  /第[0-9０-９]+页/,
  /第[0-9０-９]+小组/,
  /page [0-9]+/i,
  /p\.[0-9]+/i
];

function compileProject() {
  rmSync(compiledDir, { recursive: true, force: true });
  execFileSync(
    path.join(rootDir, "node_modules", ".bin", "tsc"),
    [
      "-p",
      "tsconfig.json",
      "--outDir",
      compiledDir,
      "--noEmit",
      "false",
      "--incremental",
      "false",
      "--module",
      "commonjs",
      "--moduleResolution",
      "node"
    ],
    { cwd: rootDir, stdio: "inherit" }
  );

  const aliasDir = path.join(compiledDir, "node_modules", "@");
  mkdirSync(aliasDir, { recursive: true });
  for (const name of ["data", "lib", "types.js"]) {
    const target = path.join(compiledDir, name);
    const link = path.join(aliasDir, name);
    if (existsSync(target) && !existsSync(link)) symlinkSync(path.relative(aliasDir, target), link);
  }
}

function textValue(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value.zhHans ?? value.zh ?? value.en ?? "";
}

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[，,。．.\s]/g, "")
    .replace(/[（）]/g, (char) => (char === "（" ? "(" : ")"))
    .trim();
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csv(rows, columns) {
  return `${columns.join(",")}\n${rows.map((row) => columns.map((column) => csvEscape(row[column])).join(",")).join("\n")}\n`;
}

function countBy(rows, key) {
  const counts = {};
  for (const row of rows) {
    const value = typeof key === "function" ? key(row) : row[key];
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}

function markdownTable(headers, rows) {
  const escapeCell = (value) => String(value ?? "").replace(/\|/g, "\\|");
  return [
    `| ${headers.map(escapeCell).join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map(escapeCell).join(" | ")} |`)
  ].join("\n");
}

function statusFromForbiddenScan(question) {
  const serialized = JSON.stringify({
    prompt: question.prompt,
    options: question.options ?? [],
    answer: question.answer,
    explanation: question.explanation
  });
  const hits = forbiddenPatterns
    .filter((pattern) => (typeof pattern === "string" ? serialized.includes(pattern) : pattern.test(serialized)))
    .map(String);
  return { status: hits.length ? "fail" : "pass", hits };
}

function main() {
  compileProject();
  const require = createRequire(import.meta.url);
  const {
    independentMainlandPepPrimaryAnswer,
    mainlandPepPrimaryManualReviewReplacementQuestionIds,
    mainlandPepPrimaryQuestionGenerationMetadata,
    mainlandPepPrimaryRagV1Questions
  } = require(path.join(compiledDir, "data", "mainlandPepPrimaryQuestions.js"));

  const questionsById = new Map(mainlandPepPrimaryRagV1Questions.map((question) => [question.id, question]));
  const promptCounts = countBy(
    mainlandPepPrimaryRagV1Questions,
    (question) => `${question.grade}:${question.type}:${textValue(question.prompt)}`.replace(/\s+/g, "")
  );

  const rows = mainlandPepPrimaryManualReviewReplacementQuestionIds.map((questionId, ordinal) => {
    const question = questionsById.get(questionId);
    const metadata = mainlandPepPrimaryQuestionGenerationMetadata[questionId];
    if (!question || !metadata) throw new Error(`Replacement question is missing from public bank or metadata: ${questionId}`);
    const independentAnswer = independentMainlandPepPrimaryAnswer(question);
    const options = question.options ?? [];
    const acceptedAnswers = new Set([question.answer, ...(question.acceptedAnswers ?? [])].map(normalize));
    const correctOptionHits = options.filter((option) => acceptedAnswers.has(normalize(textValue(option)))).length;
    const sourceScan = statusFromForbiddenScan(question);
    const promptKey = `${question.grade}:${question.type}:${textValue(question.prompt)}`.replace(/\s+/g, "");

    return {
      questionId,
      ordinal: ordinal + 1,
      promptFrame: `frame-${(ordinal % 3) + 1}`,
      grade: question.grade,
      semester: metadata.semester,
      type: question.type,
      difficulty: question.difficulty,
      topicId: question.topicId,
      family: metadata.family,
      promptZhHans: textValue(question.prompt),
      answer: question.answer,
      independentAnswer,
      deterministicAnswerStatus: independentAnswer === question.answer ? "pass" : "fail",
      optionCount: question.type === "multiple-choice" ? options.length : "",
      correctOptionHits: question.type === "multiple-choice" ? correctOptionHits : "",
      multipleChoiceStatus: question.type === "multiple-choice" && options.length === 4 && correctOptionHits === 1 ? "pass" : question.type === "multiple-choice" ? "fail" : "n/a",
      sourceSafetyStatus: sourceScan.status,
      sourceSafetyHits: sourceScan.hits.join("; "),
      exactPromptDuplicateStatus: promptCounts[promptKey] === 1 ? "pass" : "fail",
      evidenceCardCount: metadata.evidenceCardIds.length,
      examPatternCardCount: metadata.examPatternCardIds.length
    };
  });

  const failingRows = rows.filter(
    (row) =>
      row.deterministicAnswerStatus !== "pass" ||
      row.multipleChoiceStatus === "fail" ||
      row.sourceSafetyStatus !== "pass" ||
      row.exactPromptDuplicateStatus !== "pass"
  );
  const topicFrameRows = Object.entries(countBy(rows, "topicId")).map(([topicId, count]) => {
    const topicRows = rows.filter((row) => row.topicId === topicId);
    return [topicId, count, new Set(topicRows.map((row) => row.promptFrame)).size];
  });
  const topicFrameWarnings = topicFrameRows.filter(([, count, frameCount]) => count >= 3 && frameCount < 3);

  const summary = `# S18 Mainland PEP Primary Local 166 Same-ID RAG Replacement Audit

- Date: ${reportDate}
- Session ID: S18
- Workstream: Curriculum/content QA
- Scope: Same-ID deterministic local RAG replacement for 166 Mainland PEP primary local rows previously marked \`rewrite\`
- Public primary local RAG count: ${mainlandPepPrimaryRagV1Questions.length}
- Replacement IDs restored: ${rows.length}/${mainlandPepPrimaryManualReviewReplacementQuestionIds.length}
- Result: ${failingRows.length === 0 && mainlandPepPrimaryRagV1Questions.length === 1200 ? "pass" : "needs attention"}

## Distribution

${markdownTable(["Grade", "Replacement rows"], Object.entries(countBy(rows, "grade")).map(([grade, count]) => [grade, count]))}

${markdownTable(["Type", "Replacement rows"], Object.entries(countBy(rows, "type")).map(([type, count]) => [type, count]))}

${markdownTable(["Topic", "Rows", "Prompt frames"], topicFrameRows)}

## QA Gates

${markdownTable(
  ["Gate", "Result"],
  [
    ["166 replacement IDs present in public bank", rows.length === 166 ? "pass" : "fail"],
    ["Public primary local RAG count is 1200", mainlandPepPrimaryRagV1Questions.length === 1200 ? "pass" : "fail"],
    ["Deterministic answer check", rows.every((row) => row.deterministicAnswerStatus === "pass") ? "pass" : "fail"],
    ["Multiple-choice unique answer check", rows.every((row) => row.multipleChoiceStatus !== "fail") ? "pass" : "fail"],
    ["Source-distance / forbidden artifact scan", rows.every((row) => row.sourceSafetyStatus === "pass") ? "pass" : "fail"],
    ["Exact prompt duplicate scan", rows.every((row) => row.exactPromptDuplicateStatus === "pass") ? "pass" : "fail"],
    ["Topic families with at least 3 replacement rows use 3 prompt frames", topicFrameWarnings.length === 0 ? "pass" : "fail"]
  ]
)}

## Failing Rows

${failingRows.length ? markdownTable(["Question ID", "Issue"], failingRows.map((row) => [row.questionId, JSON.stringify(row)])) : "- None."}

## Risks And Follow-Up

- This audit verifies deterministic replacement mechanics, answer-key agreement, source-safety scan, and duplicate-prompt absence.
- It does not replace a future S18 human sample after the replacement set is promoted; the next QA pass should sample the restored 1200-bank with emphasis on the 166 replacement rows and adjacent topic clusters.
- Historical S18 manual-review artifacts are retained as evidence of why these IDs were replaced.
`;

  const columns = [
    "questionId",
    "ordinal",
    "promptFrame",
    "grade",
    "semester",
    "type",
    "difficulty",
    "topicId",
    "family",
    "promptZhHans",
    "answer",
    "independentAnswer",
    "deterministicAnswerStatus",
    "optionCount",
    "correctOptionHits",
    "multipleChoiceStatus",
    "sourceSafetyStatus",
    "sourceSafetyHits",
    "exactPromptDuplicateStatus",
    "evidenceCardCount",
    "examPatternCardCount"
  ];

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(path.join(outputDir, `${baseName}-audit.csv`), csv(rows, columns));
  writeFileSync(path.join(outputDir, `${baseName}-summary.md`), summary);
  rmSync(compiledDir, { recursive: true, force: true });
  console.log(
    JSON.stringify(
      {
        publicPrimaryLocalRagCount: mainlandPepPrimaryRagV1Questions.length,
        replacementRows: rows.length,
        failingRows: failingRows.length,
        outputCsv: path.join(outputDir, `${baseName}-audit.csv`),
        outputMarkdown: path.join(outputDir, `${baseName}-summary.md`)
      },
      null,
      2
    )
  );
}

main();
