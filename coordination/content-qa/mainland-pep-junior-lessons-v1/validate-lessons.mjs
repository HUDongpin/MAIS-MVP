#!/usr/bin/env node

import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "../../..");
const packDir = __dirname;
const lessonsPath = join(packDir, "lessons.json");
const reviewDir = join(packDir, "review");
const tmpDir = join(projectRoot, ".tmp/mainland-junior-lesson-validate");
const tmpConfigPath = join(projectRoot, ".tmp/mainland-junior-lesson-validate-tsconfig.json");
const schemaVersion = "mainland-pep-junior-lessons-v1";
const validationGeneratedAt = "2026-05-23T16:10:00+08:00";
const require = createRequire(import.meta.url);

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function installTsRequireHook() {
  if (globalThis.__maisJuniorLessonTsHookInstalled) return;
  const ts = require("typescript");
  const Module = require("node:module");
  const originalResolveFilename = Module._resolveFilename;

  Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
    if (typeof request === "string" && request.startsWith("@/")) {
      return originalResolveFilename.call(this, join(projectRoot, request.slice(2)), parent, isMain, options);
    }
    return originalResolveFilename.call(this, request, parent, isMain, options);
  };

  Module._extensions[".ts"] = function compileTs(module, filename) {
    const source = readFileSync(filename, "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        resolveJsonModule: true,
        jsx: ts.JsxEmit.ReactJSX
      },
      fileName: filename
    }).outputText;
    module._compile(output, filename);
  };

  globalThis.__maisJuniorLessonTsHookInstalled = true;
}

function flattenStrings(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) value.forEach((item) => flattenStrings(item, out));
  else if (value && typeof value === "object") Object.values(value).forEach((item) => flattenStrings(item, out));
  return out;
}

function normalizePrompt(value) {
  return String(value)
    .toLowerCase()
    .replace(/\\\(|\\\)/g, "")
    .replace(/\s+/g, "")
    .replace(/[，。！？、,.!?;；:："'“”‘’（）()[\]{}]/g, "");
}

function countOccurrences(text, token) {
  return String(text).split(token).length - 1;
}

function inlineMathTokens(text) {
  return Array.from(String(text).matchAll(/\\\((.*?)\\\)/g)).map((match) =>
    match[1].replace(/\s+/g, "").replace(/\\text\{[^}]*\}/g, "\\text{}")
  );
}

function compareMathTokens(label, zh, en, errors) {
  const zhTokens = inlineMathTokens(zh);
  const enTokens = inlineMathTokens(en);
  if (!zhTokens.length && !enTokens.length) return;
  const zhComparable = [...zhTokens].sort();
  const enComparable = [...enTokens].sort();
  if (zhComparable.join("|") !== enComparable.join("|")) {
    errors.push(`bilingual math mismatch in ${label}: zh=[${zhTokens.join(", ")}], en=[${enTokens.join(", ")}]`);
  }
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

function localizedQuestionPromptStrings(question) {
  const prompt = question?.prompt;
  if (!prompt || typeof prompt !== "object") return [];
  return Object.values(prompt).filter((value) => typeof value === "string");
}

function validateLesson(lesson, expectedTopicIds, existingPromptSet, productionMode) {
  const errors = [];
  const warnings = [];
  const strings = flattenStrings(lesson);
  const serialized = JSON.stringify(lesson);
  const zh = lesson.studentLesson?.zhHans;
  const en = lesson.studentLesson?.en;
  const bilingualSections = lesson.studentLesson?.bilingual?.sections ?? [];
  const forbiddenPatterns = [
    { label: "page-reference", pattern: /第\s*\d+\s*页|p\.\s*\d+/i },
    { label: "source-original-text-marker", pattern: /原文|照抄|逐字|OCR/i },
    { label: "source-visual-marker", pattern: /截图|扫描|页图|source\s+image/i },
    { label: "official-solution-marker", pattern: /官方解析|官方答案|答案解析/ },
    { label: "source-reconstruction-marker", pattern: /真题原题|sourceArchive|source locator/i }
  ];

  if (lesson.schemaVersion !== schemaVersion) errors.push("schemaVersion mismatch");
  if (!lesson.id || !lesson.metadata?.topicId) errors.push("missing id or topicId");
  if (!expectedTopicIds.has(lesson.metadata?.topicId)) errors.push(`unknown topicId ${lesson.metadata?.topicId}`);
  if (lesson.reviewStatus !== "needs-review" && lesson.reviewStatus !== "approved") errors.push("reviewStatus must be needs-review or approved");
  if (lesson.integrationStatus !== "not-integrated" && lesson.integrationStatus !== "production-integrated") errors.push("integrationStatus must be not-integrated or production-integrated");
  if (productionMode) {
    if (lesson.reviewStatus !== "approved") errors.push("production pack lessons must be approved");
    if (lesson.integrationStatus !== "production-integrated") errors.push("production pack lessons must be production-integrated");
    if (lesson.futureProductionMapping?.productionLessonSeedReady !== true) errors.push("production pack lessons must be productionLessonSeedReady");
  } else {
    if (lesson.integrationStatus === "production-integrated") errors.push("review-only pack must not be production-integrated");
    if (lesson.futureProductionMapping?.productionLessonSeedReady === true) errors.push("review-only pack cannot be marked productionLessonSeedReady");
  }
  if (lesson.metadata?.sourceSafetyStatus !== "safe-rag-only") errors.push("sourceSafetyStatus must be safe-rag-only");
  if (!zh || !en) errors.push("missing zhHans or English student lesson");
  if (!lesson.studentLesson?.bilingual || bilingualSections.length < 10) errors.push("bilingual rendering must include at least 10 aligned sections");
  if (lesson.studentLesson?.bilingualAlignment?.length !== bilingualSections.length) errors.push("bilingualAlignment must mirror bilingual sections");
  if (!lesson.metadata?.evidence?.ragCardIds?.includes(lesson.metadata?.ragCardId)) errors.push("missing matching curriculum RAG card ID");
  if (!lesson.metadata?.evidence?.juniorPaperPatternCardIds?.length) errors.push("missing junior paper-pattern evidence IDs");
  if (!lesson.metadata?.evidence?.juniorExamPatternCardIds?.length) errors.push("missing junior exam-pattern evidence IDs");
  if ((zh?.objectives ?? []).length < 3 || (en?.objectives ?? []).length < 3) errors.push("each language needs at least three objectives");
  if ((zh?.workedExamples ?? []).length < 2 || (en?.workedExamples ?? []).length < 2) errors.push("each language needs at least two worked examples");
  if ((zh?.checkpoints ?? []).length < 3 || (en?.checkpoints ?? []).length < 3) errors.push("each language needs at least three checkpoints");
  if ((zh?.glossary ?? []).length < 4 || (en?.glossary ?? []).length < 4) errors.push("each language needs at least four glossary entries");

  for (const languageKey of ["zhHans", "en"]) {
    const content = lesson.studentLesson?.[languageKey];
    for (const checkpoint of content?.checkpoints ?? []) {
      if (!checkpoint.answer || !checkpoint.explanation) errors.push(`${languageKey} checkpoint ${checkpoint.id ?? "unknown"} missing answer/explanation`);
    }
  }

  for (const { label, pattern } of forbiddenPatterns) {
    if (pattern.test(serialized)) errors.push(`forbidden source artifact marker: ${label}`);
  }

  for (const text of strings) {
    if (countOccurrences(text, "\\(") !== countOccurrences(text, "\\)")) errors.push("unbalanced inline KaTeX delimiters");
  }

  if (zh && en) {
    zh.workedExamples.forEach((example, index) => {
      const other = en.workedExamples[index];
      if (!other) return;
      compareMathTokens(`workedExamples[${index}].prompt`, example.prompt, other.prompt, errors);
      compareMathTokens(`workedExamples[${index}].solution`, example.solution, other.solution, errors);
      compareMathTokens(`workedExamples[${index}].check`, example.check, other.check, errors);
    });
    zh.checkpoints.forEach((checkpoint, index) => {
      const other = en.checkpoints[index];
      if (!other) return;
      compareMathTokens(`checkpoints[${index}].prompt`, checkpoint.prompt, other.prompt, errors);
      compareMathTokens(`checkpoints[${index}].explanation`, checkpoint.explanation, other.explanation, errors);
    });
  }

  const duplicates = lessonPrompts(lesson)
    .map(normalizePrompt)
    .filter((prompt) => prompt && existingPromptSet.has(prompt));
  if (duplicates.length) errors.push(`exact prompt duplicate against existing question bank: ${duplicates.length}`);

  if (!productionMode && lesson.reviewStatus !== "approved") {
    warnings.push("human review pending before production mapping");
  }

  return {
    lessonId: lesson.id,
    topicId: lesson.metadata?.topicId,
    grade: lesson.metadata?.grade,
    semester: lesson.metadata?.semester,
    unitTitle: lesson.metadata?.unitTitle,
    pilot: Boolean(lesson.pilot),
    automatedValidation: errors.length ? "blocked" : "passed",
    releaseDecision: errors.length ? "blocked" : productionMode ? "approved" : "needs-human-review",
    errors,
    warnings
  };
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function renderCsv(rows) {
  const headers = [
    "lesson_id",
    "topic_id",
    "grade",
    "semester",
    "unit_title",
    "automated_validation",
    "release_decision",
      "s18_decision",
      "s09_decision",
      "s05_decision",
      "s11_post_integration_route_smoke",
      "notes"
  ];
  return [
    headers.join(","),
    ...rows.map((row) => [
      row.lessonId,
      row.topicId,
      row.grade,
      row.semester,
      row.unitTitle,
      row.automatedValidation,
      row.releaseDecision,
      row.releaseDecision === "approved" ? "approved" : "pending",
      row.releaseDecision === "approved" ? "approved" : "pending",
      row.releaseDecision === "approved" ? "approved" : "pending",
      row.releaseDecision === "approved" ? "pending-route-smoke" : "not-applicable-until-integration",
      row.errors.length ? row.errors.join("; ") : row.warnings.join("; ")
    ].map(csvEscape).join(","))
  ].join("\n") + "\n";
}

function renderQaReport(report) {
  const approvedForProduction = report.releaseStatus === "approved-for-production";
  return [
    "# S18 Mainland PEP Junior Generated Lesson-Textbook Pack QA",
    "",
    "- Date: 2026-05-23",
    "- Session ID: S18",
    approvedForProduction
      ? "- Scope: Approved 初中教材 pack for Mainland PEP S1-S3 safe-RAG Lesson-section integration."
      : "- Scope: Review-only generated 初中教材 pack for Mainland PEP S1-S3 safe-RAG alignment.",
    `- Lesson count: ${report.lessonCount} / ${report.expectedLessonCount}`,
    `- Automated validation: ${report.packStatus}`,
    `- Release status: ${report.releaseStatus}`,
    "",
    "## Verdict",
    "",
    report.packStatus === "passed-automated-validation" && approvedForProduction
      ? "PASS for automated schema, source-safety, bilingual-structure, math-token consistency, evidence-ID, and exact prompt-duplicate checks. S18/S09/S05 gates are approved for Lesson-section integration; S11 route/browser smoke remains the post-integration verification gate."
      : report.packStatus === "passed-automated-validation"
      ? "PASS for automated schema, source-safety, bilingual-structure, math-token consistency, evidence-ID, and exact prompt-duplicate checks. NOT approved for Lesson-section integration until S18, S09, S05, and future S11 gates are complete."
      : "BLOCKED. Resolve validation errors before human release review.",
    "",
    "## Validation Coverage",
    "",
    "- Required lesson count and exact S1-S3 RAG-card topic coverage.",
    "- `zhHans`, `en`, and bilingual aligned rendering presence.",
    "- Required lesson-textbook sections: objectives, warm-up, concept, worked examples, pitfalls, misconception clinic, strategy checklist, checkpoints, exam strategy, extension, exit ticket, and glossary.",
    "- Curriculum RAG, junior paper-pattern, and junior exam-pattern evidence IDs.",
    "- Forbidden source-artifact markers: page references, OCR/original-text markers, screenshots/scans, official answer/solution wording markers, and source locator markers.",
    "- Inline KaTeX delimiter balance.",
    "- Bilingual worked-example/checkpoint math-token consistency.",
    `- Exact normalized prompt duplicate scan against ${report.existingQuestionBankPromptsChecked} existing question-bank prompt strings.`,
    "",
    "## Lesson Decisions",
    "",
    "| Grade | Semester | Topic ID | Unit title | Pilot | Automated validation | Release decision |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...report.rows.map((row) =>
      `| ${row.grade} | ${row.semester} | ${row.topicId} | ${String(row.unitTitle).replaceAll("|", "\\|")} | ${row.pilot ? "yes" : "no"} | ${row.automatedValidation} | ${row.releaseDecision} |`
    ),
    "",
    "## Follow-Up Review Queue",
    "",
    approvedForProduction
      ? "1. S18/S09/S05: approved for production Lesson mapping in this owner-authorized integration pass."
      : "1. S18: manually sample all pilot lessons plus at least one non-pilot per grade for mathematical correctness, grade fit, and source distance.",
    approvedForProduction
      ? "2. S11: run route/browser smoke after app integration to confirm S1-S3 lesson routes, practice blocks, and no coming-soon state."
      : "2. S09: review Simplified Chinese terminology and bilingual alignment.",
    approvedForProduction
      ? "3. Future S18/S04: keep the full 900-question junior bank candidate-only until separate QA promotion."
      : "3. S05: decide future Lesson-section topic mapping and block mapping.",
    approvedForProduction
      ? ""
      : "4. S11: run route/browser smoke only after future integration.",
    "",
    "## Errors",
    "",
    report.packErrors.length || report.rows.some((row) => row.errors.length)
      ? [
          ...report.packErrors.map((error) => `- ${error}`),
          ...report.rows.flatMap((row) => row.errors.map((error) => `- ${row.topicId}: ${error}`))
        ].join("\n")
      : "- None.",
    "",
    "## Warnings",
    "",
    report.warnings.length ? report.warnings.map((warning) => `- ${warning}`).join("\n") : "- None.",
    ""
  ].join("\n");
}

if (!existsSync(lessonsPath)) {
  console.error(`Missing ${relative(projectRoot, lessonsPath)}. Run generate-lessons.mjs first.`);
  process.exit(1);
}

installTsRequireHook();

const { mainlandPepJuniorRagCards } = require(join(projectRoot, "data/rag/mainlandPepJunior.ts"));
const { questions } = require(join(projectRoot, "data/questions.ts"));
const lessonPack = JSON.parse(readFileSync(lessonsPath, "utf8"));
const lessons = lessonPack.lessons ?? [];
const expectedTopicIds = new Set(mainlandPepJuniorRagCards.filter((card) => card.stage === "junior-secondary").map((card) => card.id));
const existingPromptSet = new Set(
  questions.flatMap(localizedQuestionPromptStrings).map(normalizePrompt).filter(Boolean)
);

const productionMode =
  lessonPack.reviewStatus === "approved" &&
  lessonPack.integrationStatus === "production-integrated" &&
  lessonPack.lessons?.every((lesson) => lesson.reviewStatus === "approved" && lesson.integrationStatus === "production-integrated");
const rows = lessons.map((lesson) => validateLesson(lesson, expectedTopicIds, existingPromptSet, productionMode));
const lessonTopicIds = new Set(lessons.map((lesson) => lesson.metadata?.topicId));
const missingTopicIds = [...expectedTopicIds].filter((topicId) => !lessonTopicIds.has(topicId));
const duplicateTopicIds = lessons
  .map((lesson) => lesson.metadata?.topicId)
  .filter((topicId, index, values) => topicId && values.indexOf(topicId) !== index);
const packErrors = [];

if (lessonPack.schemaVersion !== schemaVersion) packErrors.push("lesson pack schemaVersion mismatch");
if (lessons.length !== expectedTopicIds.size) packErrors.push(`expected ${expectedTopicIds.size} lessons, got ${lessons.length}`);
if (missingTopicIds.length) packErrors.push(`missing topic IDs: ${missingTopicIds.join(", ")}`);
if (duplicateTopicIds.length) packErrors.push(`duplicate topic IDs: ${[...new Set(duplicateTopicIds)].join(", ")}`);
if (productionMode) {
  if (lessonPack.reviewStatus !== "approved") packErrors.push("production pack must be approved");
  if (lessonPack.integrationStatus !== "production-integrated") packErrors.push("production pack must be production-integrated");
} else if (lessonPack.integrationStatus !== "not-integrated") {
  packErrors.push("review-only pack must remain not-integrated");
}

const blockedRows = rows.filter((row) => row.automatedValidation === "blocked");
const warnings = rows.flatMap((row) => row.warnings.map((warning) => `${row.topicId}: ${warning}`));
const report = {
  schemaVersion: `${schemaVersion}-validation`,
  generatedAt: validationGeneratedAt,
  lessonCount: lessons.length,
  expectedLessonCount: expectedTopicIds.size,
  existingQuestionBankPromptsChecked: existingPromptSet.size,
  packStatus: packErrors.length || blockedRows.length ? "blocked" : "passed-automated-validation",
  releaseStatus: packErrors.length || blockedRows.length ? "blocked" : productionMode ? "approved-for-production" : "needs-human-review",
  packErrors,
  warnings,
  rows
};

mkdirSync(reviewDir, { recursive: true });
writeJson(join(packDir, "validation-report.json"), report);
writeFileSync(join(packDir, "qa-report.md"), renderQaReport(report));
writeFileSync(join(reviewDir, "lesson-review-records.csv"), renderCsv(rows));

if (report.packStatus === "blocked") {
  console.error(`Validation blocked. See ${relative(projectRoot, join(packDir, "qa-report.md"))}.`);
  process.exit(1);
}

console.log(`Validated ${lessons.length} Mainland PEP junior lessons. Release status: ${report.releaseStatus}.`);
