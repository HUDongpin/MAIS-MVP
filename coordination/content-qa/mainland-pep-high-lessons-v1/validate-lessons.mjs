#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "../../..");
const packDir = __dirname;
const lessonsPath = join(packDir, "lessons.json");
const tmpDir = join(projectRoot, ".tmp/mainland-high-lesson-validate");
const tmpConfigPath = join(projectRoot, ".tmp/mainland-high-lesson-validate-tsconfig.json");
const generatedAt = "2026-05-23T00:00:00+08:00";

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function compileValidationSubset() {
  mkdirSync(join(projectRoot, ".tmp"), { recursive: true });
  rmSync(tmpDir, { recursive: true, force: true });
  writeJson(tmpConfigPath, {
    extends: "../tsconfig.json",
    compilerOptions: {
      outDir: "mainland-high-lesson-validate",
      noEmit: false,
      incremental: false,
      module: "commonjs",
      moduleResolution: "node",
      rootDir: "..",
      baseUrl: ".."
    },
    include: [
      "../types/**/*.ts",
      "../data/rag/**/*.ts",
      "../data/mainlandPepHighTopics.ts",
      "../data/mainlandPepHighQuestions.ts",
      "../lib/rag/**/*.ts"
    ],
    exclude: [
      "../node_modules",
      "../.next",
      "mainland-high-lesson-validate",
      "../output",
      "../outputs",
      "../test-results"
    ]
  });

  execFileSync(join(projectRoot, "node_modules/.bin/tsc"), ["-p", tmpConfigPath], {
    cwd: projectRoot,
    stdio: "inherit"
  });
}

function flattenStrings(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((item) => flattenStrings(item, out));
  else if (value && typeof value === "object") Object.values(value).forEach((item) => flattenStrings(item, out));
  return out;
}

function normalizePrompt(value) {
  return value
    .toLowerCase()
    .replace(/\\\(|\\\)/g, "")
    .replace(/\s+/g, "")
    .replace(/[，。！？、,.!?;；:："'“”‘’（）()[\]{}]/g, "");
}

function countOccurrences(text, token) {
  return text.split(token).length - 1;
}

function lessonPrompts(lesson) {
  const prompts = [];
  for (const languageKey of ["zhHans", "en"]) {
    const content = lesson.studentLesson?.[languageKey];
    for (const example of content?.workedExamples ?? []) prompts.push(example.prompt);
    for (const checkpoint of content?.checkpoints ?? []) prompts.push(checkpoint.prompt);
  }
  return prompts;
}

function validateLesson(lesson, topicIds, existingPromptSet) {
  const errors = [];
  const warnings = [];
  const strings = flattenStrings(lesson);
  const serialized = JSON.stringify(lesson);
  const forbiddenPatterns = [
    { label: "page-reference", pattern: /第\s*\d+\s*页|p\.\s*\d+/i },
    { label: "source-original-text-marker", pattern: /原文|照抄|逐字|OCR/i },
    { label: "source-visual-marker", pattern: /截图|扫描|页图|source\s+image/i },
    { label: "official-solution-marker", pattern: /官方解析|官方答案|答案解析/ },
    { label: "exam-source-reconstruction-marker", pattern: /高考真题|真题原题|sourceArchive|source locator/i }
  ];

  if (lesson.schemaVersion !== "mainland-pep-high-lessons-v1") errors.push("schemaVersion mismatch");
  if (!lesson.id || !lesson.metadata?.topicId) errors.push("missing id or topicId");
  if (!topicIds.has(lesson.metadata?.topicId)) errors.push(`unknown topicId ${lesson.metadata?.topicId}`);
  if (!["not-integrated", "production-integrated"].includes(lesson.integrationStatus)) {
    errors.push("integrationStatus must be not-integrated or production-integrated");
  }
  if (!["needs-revision", "approved"].includes(lesson.reviewStatus)) {
    errors.push("reviewStatus must be needs-revision or approved");
  }
  if (lesson.reviewStatus === "approved" && lesson.futureProductionMapping?.productionLessonSeedReady !== true) {
    errors.push("approved lessons must be marked productionLessonSeedReady");
  }
  if (lesson.integrationStatus === "production-integrated" && lesson.reviewStatus !== "approved") {
    errors.push("production-integrated lessons must be approved");
  }
  if (lesson.metadata?.sourceSafetyStatus !== "safe-rag-only") errors.push("sourceSafetyStatus must be safe-rag-only");
  if (!lesson.studentLesson?.zhHans || !lesson.studentLesson?.en) errors.push("missing zhHans or en student lesson");
  if (!Array.isArray(lesson.studentLesson?.bilingualAlignment) || lesson.studentLesson.bilingualAlignment.length < 8) {
    errors.push("bilingualAlignment must have at least 8 sections");
  }
  if (!lesson.metadata?.evidence?.ragCardIds?.length) errors.push("missing safe RAG card IDs");
  if (!lesson.metadata?.evidence?.examPatternCardIds?.length) warnings.push("no secondary exam-pattern card IDs retrieved");
  if ((lesson.studentLesson?.zhHans?.workedExamples ?? []).length < 1) errors.push("needs at least one zhHans worked example");
  if ((lesson.studentLesson?.en?.workedExamples ?? []).length < 1) errors.push("needs at least one English worked example");
  if ((lesson.studentLesson?.zhHans?.checkpoints ?? []).length < 3) errors.push("needs at least three zhHans checkpoints");
  if ((lesson.studentLesson?.en?.checkpoints ?? []).length < 3) errors.push("needs at least three English checkpoints");

  for (const languageKey of ["zhHans", "en"]) {
    for (const checkpoint of lesson.studentLesson?.[languageKey]?.checkpoints ?? []) {
      if (!checkpoint.answer || !checkpoint.explanation) errors.push(`checkpoint ${checkpoint.id ?? "unknown"} missing answer/explanation`);
    }
  }

  for (const { label, pattern } of forbiddenPatterns) {
    if (pattern.test(serialized)) errors.push(`forbidden source artifact marker: ${label}`);
  }

  for (const text of strings) {
    if (countOccurrences(text, "\\(") !== countOccurrences(text, "\\)")) errors.push("unbalanced inline KaTeX delimiters");
  }

  const duplicates = lessonPrompts(lesson)
    .map(normalizePrompt)
    .filter((prompt) => prompt && existingPromptSet.has(prompt));
  if (duplicates.length) errors.push(`exact prompt duplicate against public high-school question bank: ${duplicates.length}`);

  return {
    topicId: lesson.metadata?.topicId,
    grade: lesson.metadata?.grade,
    chapter: lesson.metadata?.chapter,
    pilot: Boolean(lesson.pilot),
    automatedValidation: errors.length ? "blocked" : "passed",
    releaseDecision: errors.length ? "blocked" : lesson.reviewStatus === "approved" ? "approved" : "needs-revision",
    errors,
    warnings
  };
}

if (!existsSync(lessonsPath)) {
  console.error(`Missing ${relative(projectRoot, lessonsPath)}. Run generate-lessons.mjs first.`);
  process.exit(1);
}

compileValidationSubset();

const require = createRequire(import.meta.url);
const { mainlandPepHighTopics } = require(join(tmpDir, "data/mainlandPepHighTopics.js"));
const { mainlandPepHighQuestions } = require(join(tmpDir, "data/mainlandPepHighQuestions.js"));
const lessonPack = JSON.parse(readFileSync(lessonsPath, "utf8"));
const lessons = lessonPack.lessons ?? [];
const topicIds = new Set(mainlandPepHighTopics.map((topic) => topic.id));
const expectedTopicIds = new Set(mainlandPepHighTopics.map((topic) => topic.id));
const existingPromptSet = new Set(
  mainlandPepHighQuestions.flatMap((question) => [
    normalizePrompt(question.prompt?.zh ?? ""),
    normalizePrompt(question.prompt?.en ?? "")
  ]).filter(Boolean)
);

const rows = lessons.map((lesson) => validateLesson(lesson, topicIds, existingPromptSet));
const lessonTopicIds = new Set(lessons.map((lesson) => lesson.metadata?.topicId));
const missingTopicIds = [...expectedTopicIds].filter((topicId) => !lessonTopicIds.has(topicId));
const duplicateTopicIds = lessons
  .map((lesson) => lesson.metadata?.topicId)
  .filter((topicId, index, values) => topicId && values.indexOf(topicId) !== index);
const packErrors = [];
if (lessons.length !== mainlandPepHighTopics.length) {
  packErrors.push(`expected ${mainlandPepHighTopics.length} lessons, got ${lessons.length}`);
}
if (missingTopicIds.length) packErrors.push(`missing topic IDs: ${missingTopicIds.join(", ")}`);
if (duplicateTopicIds.length) packErrors.push(`duplicate topic IDs: ${duplicateTopicIds.join(", ")}`);

const blockedRows = rows.filter((row) => row.automatedValidation === "blocked");
const warnings = rows.flatMap((row) => row.warnings.map((warning) => `${row.topicId}: ${warning}`));
const report = {
  schemaVersion: "mainland-pep-high-lessons-v1-validation",
  generatedAt,
  lessonCount: lessons.length,
  expectedLessonCount: mainlandPepHighTopics.length,
  existingQuestionBankPromptsChecked: existingPromptSet.size,
  packStatus: packErrors.length || blockedRows.length ? "blocked" : "passed-automated-validation",
  releaseStatus: packErrors.length || blockedRows.length
    ? "blocked"
    : rows.every((row) => row.releaseDecision === "approved")
      ? "approved-for-production"
      : "needs-human-review",
  packErrors,
  warnings,
  rows
};

writeJson(join(packDir, "validation-report.json"), report);

function renderQaReport() {
  return [
    "# S18 Mainland PEP High-School Generated Lesson Pack QA",
    "",
    `- Date: 2026-05-23`,
    `- Session ID: S18`,
    `- Scope: Review-only generated 高中教材 drafts for MAINLAND_PEP_HIGH`,
    `- Lesson count: ${lessons.length} / ${mainlandPepHighTopics.length}`,
    `- Automated validation: ${report.packStatus}`,
    `- Release status: ${report.releaseStatus}`,
    "",
    "## Verdict",
    "",
    report.packStatus === "passed-automated-validation"
      ? report.releaseStatus === "approved-for-production"
        ? "PASS for automated schema/source-safety/bilingual/duplicate validation. S18/S09/S05 review status is approved for production Lesson integration."
        : "PASS for automated schema/source-safety/bilingual/duplicate validation. NOT approved for production Lesson integration until S18/S09/S05 human review is complete."
      : "BLOCKED. Resolve validation errors before any human release review.",
    "",
    "## Validation Coverage",
    "",
    "- Required lesson count and topic coverage.",
    "- Unique topic IDs.",
    "- `zhHans`, `en`, and bilingual alignment fields.",
    "- Safe RAG card ID presence and secondary exam-pattern card ID retrieval.",
    "- Required worked examples and checkpoint answers/explanations.",
    "- Forbidden source-artifact markers: page references, OCR/original-text markers, screenshots/scans, official answer/solution wording markers, and source locator markers.",
    "- Inline KaTeX delimiter balance.",
    `- Exact normalized prompt duplicate scan against ${existingPromptSet.size} existing Mainland high-school question-bank prompt strings.`,
    "",
    "## Lesson Decisions",
    "",
    "| Grade | Topic ID | Chapter | Pilot | Automated validation | Release decision |",
    "| --- | --- | --- | --- | --- | --- |",
    ...rows.map((row) => `| ${row.grade} | ${row.topicId} | ${row.chapter} | ${row.pilot ? "yes" : "no"} | ${row.automatedValidation} | ${row.releaseDecision} |`),
    "",
    "## Follow-Up Review Queue",
    "",
    "1. S18: perform human mathematical correctness, curriculum alignment, and source-distance sampling, starting with the 3 pilot lessons.",
    "2. S09: review Simplified Chinese terminology and bilingual alignment.",
    "3. S05: assess whether each draft maps cleanly into current Lesson blocks.",
    "4. S11: after future integration only, run representative Lesson route checks.",
    "",
    "## Errors",
    "",
    packErrors.length || blockedRows.length
      ? [
          ...packErrors.map((error) => `- ${error}`),
          ...blockedRows.flatMap((row) => row.errors.map((error) => `- ${row.topicId}: ${error}`))
        ].join("\n")
      : "- None.",
    "",
    "## Warnings",
    "",
    warnings.length ? warnings.map((warning) => `- ${warning}`).join("\n") : "- None.",
    ""
  ].join("\n");
}

writeFileSync(join(packDir, "qa-report.md"), renderQaReport());

if (report.packStatus !== "passed-automated-validation") {
  console.error(`Validation failed. See ${relative(projectRoot, join(packDir, "qa-report.md"))}.`);
  process.exit(1);
}

console.log(`Validation passed for ${lessons.length} generated lessons. Release status: ${report.releaseStatus}.`);
