#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packPath = join(__dirname, "lessons.json");
const pack = JSON.parse(readFileSync(packPath, "utf8"));
const errors = [];
const warnings = [];
const topicIds = new Set();
const promptFingerprints = new Set();
const requiredCount = 21;
const forbiddenPatterns = [
  /第\s*\d+\s*页/u,
  /page\s*\d+/iu,
  /OCR/i,
  /扫描/u,
  /截图/u,
  /原文/u,
  /源文件/u,
  /source\s*file/i,
  /answer\s*key/i,
  /official\s*solution/i,
  /标准答案/u,
  /参考答案/u,
  /解析原文/u
];

function fingerprint(value) {
  return String(value)
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[，。,.!?！？：:；;、]/g, "");
}

function push(condition, message) {
  if (!condition) errors.push(message);
}

function hasText(value) {
  return typeof value === "string" && value.trim().length >= 4;
}

function scanText(label, value) {
  const text = JSON.stringify(value);
  forbiddenPatterns.forEach((pattern) => {
    if (pattern.test(text)) errors.push(`${label} contains forbidden source marker: ${pattern}`);
  });
}

push(pack.packageId === "mainland-hjb-high-lessons-v1", "packageId mismatch");
push(pack.curriculumTrack === "MAINLAND_PEP_HIGH", "curriculumTrack must remain MAINLAND_PEP_HIGH");
push(pack.publisher === "MAINLAND_HJB", "publisher must be MAINLAND_HJB");
push(Array.isArray(pack.lessons), "lessons must be an array");
push(pack.lessons?.length === requiredCount, `expected ${requiredCount} lessons, found ${pack.lessons?.length ?? 0}`);

(pack.lessons ?? []).forEach((lesson, index) => {
  const prefix = `lesson[${index}]`;
  const metadata = lesson.metadata ?? {};
  const zh = lesson.studentLesson?.zhHans ?? {};
  const en = lesson.studentLesson?.en ?? {};
  const teacherZh = lesson.teacherGuide?.zhHans ?? {};
  const teacherEn = lesson.teacherGuide?.en ?? {};

  push(lesson.reviewStatus === "approved", `${prefix} reviewStatus must be approved`);
  push(lesson.integrationStatus === "production-integrated", `${prefix} integrationStatus must be production-integrated`);
  push(lesson.sourceSafetyStatus === "safe-rag-original-content", `${prefix} sourceSafetyStatus must be safe-rag-original-content`);
  push(metadata.topicId?.startsWith("hjb-high-"), `${prefix} topicId must start with hjb-high-`);
  push(metadata.slug === metadata.topicId, `${prefix} slug must match topicId`);
  push(metadata.curriculumTrack === "MAINLAND_PEP_HIGH", `${prefix} curriculumTrack mismatch`);
  push(metadata.publisher === "MAINLAND_HJB", `${prefix} publisher mismatch`);
  push(["S4", "S5", "S6"].includes(metadata.grade), `${prefix} grade must be S4/S5/S6`);
  push(["Foundation", "Core", "Exam", "Challenge"].includes(metadata.difficulty), `${prefix} difficulty mismatch`);
  push(Number.isInteger(metadata.estimatedMinutes) && metadata.estimatedMinutes >= 30, `${prefix} estimatedMinutes too low`);
  push(Array.isArray(metadata.textbookCardIds) && metadata.textbookCardIds.includes(metadata.topicId), `${prefix} missing own textbook card id`);
  push(Array.isArray(metadata.hjbExamPatternCardIds), `${prefix} missing HJB assessment evidence ids`);
  push(Array.isArray(metadata.sharedExamPatternCardIds), `${prefix} missing shared exam evidence ids`);
  push(Array.isArray(metadata.conceptIds) && metadata.conceptIds.length >= 2, `${prefix} needs concept ids`);
  push(Array.isArray(metadata.competencyTags) && metadata.competencyTags.length >= 2, `${prefix} needs competency tags`);

  if (topicIds.has(metadata.topicId)) errors.push(`${prefix} duplicate topicId ${metadata.topicId}`);
  topicIds.add(metadata.topicId);

  [zh, en].forEach((student, languageIndex) => {
    const label = languageIndex === 0 ? "zhHans" : "en";
    push(hasText(student.title), `${prefix}.${label}.title missing`);
    push(hasText(student.hook), `${prefix}.${label}.hook missing`);
    push(Array.isArray(student.objectives) && student.objectives.length >= 3, `${prefix}.${label}.objectives need 3 items`);
    push(hasText(student.prerequisiteWarmUp), `${prefix}.${label}.prerequisiteWarmUp missing`);
    push(hasText(student.conceptExplanation), `${prefix}.${label}.conceptExplanation missing`);
    push(Array.isArray(student.workedExamples) && student.workedExamples.length >= 2, `${prefix}.${label}.workedExamples need 2 examples`);
    push(Array.isArray(student.commonPitfalls) && student.commonPitfalls.length >= 1, `${prefix}.${label}.commonPitfalls missing`);
    push(Array.isArray(student.checkpoints) && student.checkpoints.length >= 3, `${prefix}.${label}.checkpoints need 3 items`);
    push(hasText(student.examStyleStrategy), `${prefix}.${label}.examStyleStrategy missing`);
    push(hasText(student.extension), `${prefix}.${label}.extension missing`);
    push(hasText(student.exitTicket), `${prefix}.${label}.exitTicket missing`);

    (student.workedExamples ?? []).forEach((example, exampleIndex) => {
      push(hasText(example.title), `${prefix}.${label}.workedExamples[${exampleIndex}].title missing`);
      push(hasText(example.prompt), `${prefix}.${label}.workedExamples[${exampleIndex}].prompt missing`);
      push(hasText(example.solution), `${prefix}.${label}.workedExamples[${exampleIndex}].solution missing`);
      push(hasText(example.check), `${prefix}.${label}.workedExamples[${exampleIndex}].check missing`);
      const key = fingerprint(example.prompt);
      if (promptFingerprints.has(key)) warnings.push(`${prefix}.${label}.workedExamples[${exampleIndex}] duplicate-ish prompt fingerprint`);
      promptFingerprints.add(key);
    });
  });

  [teacherZh, teacherEn].forEach((teacher, languageIndex) => {
    const label = languageIndex === 0 ? "teacherGuide.zhHans" : "teacherGuide.en";
    push(Array.isArray(teacher.objectives) && teacher.objectives.length >= 3, `${prefix}.${label}.objectives need 3 items`);
    push(Array.isArray(teacher.lessonFlow) && teacher.lessonFlow.length >= 5, `${prefix}.${label}.lessonFlow need 5 items`);
    push(hasText(teacher.boardPlan), `${prefix}.${label}.boardPlan missing`);
    push(Array.isArray(teacher.keyQuestions) && teacher.keyQuestions.length >= 3, `${prefix}.${label}.keyQuestions need 3 items`);
    push(Array.isArray(teacher.differentiation) && teacher.differentiation.length >= 3, `${prefix}.${label}.differentiation need 3 items`);
    push(hasText(teacher.homework), `${prefix}.${label}.homework missing`);
  });

  push(lesson.futureProductionMapping?.productionLessonSeedReady === true, `${prefix} productionLessonSeedReady must be true`);
  push(lesson.futureProductionMapping?.includeTeacherGuideBlock === true, `${prefix} includeTeacherGuideBlock must be true`);
  scanText(`${prefix}.studentLesson`, lesson.studentLesson);
  scanText(`${prefix}.teacherGuide`, lesson.teacherGuide);
});

const report = {
  generatedAt: new Date().toISOString(),
  packageId: pack.packageId,
  lessonCount: pack.lessons?.length ?? 0,
  status: errors.length ? "failed" : "passed",
  errors,
  warnings
};

writeFileSync(join(__dirname, "validation-report.json"), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(
  join(__dirname, "qa-report.md"),
  [
    "# S18 Mainland HJB High-School Generated Lesson Pack QA",
    "",
    "- Date: 2026-05-24",
    "- Session ID: S18",
    "- Scope: Generated 沪教版高中 Lesson drafts for `MAINLAND_HJB`",
    `- Lesson count: ${pack.lessons?.length ?? 0} / ${requiredCount}`,
    `- Automated validation: ${report.status}`,
    `- Release status: ${errors.length ? "blocked" : "approved-for-production"}`,
    "",
    "## Verdict",
    "",
    errors.length
      ? "FAIL: resolve validation errors before production integration."
      : "PASS for automated schema, source-safety, bilingual, metadata, duplicate, and teacher-guide validation.",
    "",
    "## Validation Coverage",
    "",
    "- Required 21 HJB chapter-level Lesson coverage.",
    "- Unique HJB topic/slug IDs.",
    "- `MAINLAND_HJB` publisher and `MAINLAND_PEP_HIGH` compatibility track.",
    "- Student lesson fields: hook, objectives, warm-up, concept explanation, 2 worked examples, pitfalls, checkpoints, exam strategy, extension, exit ticket.",
    "- Teacher guide fields: objectives, 40-50 minute flow, board plan, key questions, differentiation, homework.",
    "- Safe RAG evidence IDs: textbook, HJB assessment-pattern, and shared exam-pattern references.",
    "- Forbidden source-artifact markers: page references, OCR/source-file markers, official-answer language, copied-source signals.",
    "- Duplicate-ish worked-example prompt fingerprints.",
    "",
    "## Errors",
    "",
    ...(errors.length ? errors.map((error) => `- ${error}`) : ["- None."]),
    "",
    "## Warnings",
    "",
    ...(warnings.length ? warnings.map((warning) => `- ${warning}`) : ["- None."]),
    ""
  ].join("\n")
);

if (errors.length) {
  console.error(`Validation failed with ${errors.length} errors.`);
  process.exit(1);
}

console.log(`Validated ${pack.lessons.length} HJB high-school lessons.`);
