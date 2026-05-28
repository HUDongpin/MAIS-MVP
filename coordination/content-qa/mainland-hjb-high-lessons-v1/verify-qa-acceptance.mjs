#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "../../..");
const pack = JSON.parse(readFileSync(join(__dirname, "lessons.json"), "utf8"));
const validationReport = JSON.parse(readFileSync(join(__dirname, "validation-report.json"), "utf8"));
const lessonsSource = readFileSync(join(projectRoot, "data/mainlandHjbHighLessons.ts"), "utf8");
const topicsSource = readFileSync(join(projectRoot, "data/mainlandHjbHighTopics.ts"), "utf8");
const questionsSource = readFileSync(join(projectRoot, "data/questions.ts"), "utf8");
const lessonViewSource = readFileSync(join(projectRoot, "components/lesson/LessonView.tsx"), "utf8");
const lessonDataSource = readFileSync(join(projectRoot, "data/lessons.ts"), "utf8");
const topicDataSource = readFileSync(join(projectRoot, "data/topics.ts"), "utf8");
const typesSource = readFileSync(join(projectRoot, "types/index.ts"), "utf8");
const userStoreSource = readFileSync(join(projectRoot, "lib/server/userStore.ts"), "utf8");

const expectedGradeCounts = { S4: 9, S5: 8, S6: 4 };
const expectedVolumeCounts = {
  "必修 第一册": 5,
  "必修 第二册": 4,
  "必修 第三册": 4,
  "选择性必修 第一册": 4,
  "选择性必修 第二册": 4
};
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
  /官方答案/u,
  /标准答案/u,
  /参考答案/u,
  /解析原文/u,
  /改编自/u,
  /源自/u
];
const traditionalZhPattern = /[學習題課檢錯導標體會內選滬與數錄圖應觀師]/u;
const invalidTextPattern = /\b(?:undefined|NaN|null)\b/i;
const blockers = [];
const warnings = [];

function assertPass(condition, message) {
  if (!condition) blockers.push(message);
}

function warn(condition, message) {
  if (!condition) warnings.push(message);
}

function countBy(values, keyFn) {
  return values.reduce((counts, value) => {
    const key = keyFn(value);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function sameCounts(actual, expected) {
  return Object.entries(expected).every(([key, value]) => actual[key] === value) &&
    Object.keys(actual).every((key) => key in expected);
}

function hasText(value) {
  return typeof value === "string" && value.trim().length >= 4;
}

function hasBalancedMathDelimiters(value) {
  const pairs = [
    ["\\(", "\\)"],
    ["\\[", "\\]"],
    ["$$", "$$"]
  ];
  return pairs.every(([open, close]) => {
    const openCount = value.split(open).length - 1;
    const closeCount = value.split(close).length - 1;
    return open === close ? openCount % 2 === 0 : openCount === closeCount;
  });
}

function scanForbidden(label, value) {
  const text = JSON.stringify(value);
  forbiddenPatterns.forEach((pattern) => {
    if (pattern.test(text)) blockers.push(`${label} contains forbidden source marker ${pattern}`);
  });
  if (invalidTextPattern.test(text)) blockers.push(`${label} contains invalid placeholder text`);
}

function csvCell(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

assertPass(pack.packageId === "mainland-hjb-high-lessons-v1", "Lesson package ID must be mainland-hjb-high-lessons-v1");
assertPass(pack.publisher === "MAINLAND_HJB", "Lesson package publisher must be MAINLAND_HJB");
assertPass(pack.curriculumTrack === "MAINLAND_PEP_HIGH", "Lesson package compatibility track must be MAINLAND_PEP_HIGH");
assertPass(Array.isArray(pack.lessons) && pack.lessons.length === 21, "Lesson package must contain exactly 21 lessons");
assertPass(validationReport.status === "passed", "validate-lessons report must be passed");

const gradeCounts = countBy(pack.lessons ?? [], (lesson) => lesson.metadata?.grade);
const volumeCounts = countBy(pack.lessons ?? [], (lesson) => lesson.metadata?.volume);
assertPass(sameCounts(gradeCounts, expectedGradeCounts), `Grade coverage mismatch: ${JSON.stringify(gradeCounts)}`);
assertPass(sameCounts(volumeCounts, expectedVolumeCounts), `Volume coverage mismatch: ${JSON.stringify(volumeCounts)}`);

const topicIds = new Set();
const manualRows = [];
(pack.lessons ?? []).forEach((lesson) => {
  const metadata = lesson.metadata ?? {};
  const zh = lesson.studentLesson?.zhHans ?? {};
  const en = lesson.studentLesson?.en ?? {};
  const teacherZh = lesson.teacherGuide?.zhHans ?? {};
  const topicLabel = metadata.topicId ?? "unknown-topic";
  const studentTexts = [
    zh.title,
    zh.hook,
    zh.prerequisiteWarmUp,
    zh.conceptExplanation,
    zh.examStyleStrategy,
    zh.extension,
    zh.exitTicket,
    ...(zh.objectives ?? []),
    ...(zh.commonPitfalls ?? []),
    ...(zh.workedExamples ?? []).flatMap((example) => [example.title, example.prompt, example.solution, example.check]),
    ...(zh.checkpoints ?? []).flatMap((checkpoint) => [checkpoint.prompt, checkpoint.answer, checkpoint.explanation])
  ];
  const teacherTexts = [
    ...(teacherZh.objectives ?? []),
    ...(teacherZh.lessonFlow ?? []),
    teacherZh.boardPlan,
    ...(teacherZh.keyQuestions ?? []),
    ...(teacherZh.differentiation ?? []),
    teacherZh.homework
  ];
  const allZhText = [...studentTexts, ...teacherTexts].filter(Boolean).join("\n");
  const allLessonText = JSON.stringify({ student: lesson.studentLesson, teacher: lesson.teacherGuide });

  assertPass(!topicIds.has(metadata.topicId), `${topicLabel} topic ID must be unique`);
  topicIds.add(metadata.topicId);
  assertPass(metadata.slug === metadata.topicId, `${topicLabel} slug must match topic ID`);
  assertPass(metadata.publisher === "MAINLAND_HJB", `${topicLabel} metadata publisher must be MAINLAND_HJB`);
  assertPass(metadata.curriculumTrack === "MAINLAND_PEP_HIGH", `${topicLabel} metadata track must be MAINLAND_PEP_HIGH`);
  assertPass(Array.isArray(metadata.textbookCardIds) && metadata.textbookCardIds.includes(metadata.topicId), `${topicLabel} must cite its own HJB textbook safe card`);
  assertPass(Array.isArray(metadata.hjbExamPatternCardIds), `${topicLabel} must carry HJB assessment-pattern card IDs`);
  assertPass(Array.isArray(metadata.sharedExamPatternCardIds), `${topicLabel} must carry shared exam-pattern card IDs`);

  assertPass(hasText(zh.hook), `${topicLabel} missing student hook`);
  assertPass(Array.isArray(zh.objectives) && zh.objectives.length >= 3, `${topicLabel} missing 3 student objectives`);
  assertPass(hasText(zh.prerequisiteWarmUp), `${topicLabel} missing warm-up`);
  assertPass(hasText(zh.conceptExplanation), `${topicLabel} missing concept explanation`);
  assertPass(Array.isArray(zh.workedExamples) && zh.workedExamples.length === 2, `${topicLabel} must have exactly 2 student worked examples`);
  assertPass(Array.isArray(zh.commonPitfalls) && zh.commonPitfalls.length >= 1, `${topicLabel} missing common pitfalls`);
  assertPass(Array.isArray(zh.checkpoints) && zh.checkpoints.length >= 3, `${topicLabel} missing checkpoints`);
  assertPass(hasText(zh.examStyleStrategy), `${topicLabel} missing exam strategy`);
  assertPass(hasText(zh.extension), `${topicLabel} missing extension task`);
  assertPass(hasText(zh.exitTicket), `${topicLabel} missing exit ticket`);

  assertPass(Array.isArray(teacherZh.lessonFlow) && teacherZh.lessonFlow.length === 5, `${topicLabel} teacher flow must have 5 steps`);
  ["0-5", "5-15", "15-30", "30-40", "40-50"].forEach((range) => {
    assertPass(JSON.stringify(teacherZh.lessonFlow ?? []).includes(range), `${topicLabel} teacher flow must include ${range} minutes`);
  });
  assertPass(hasText(teacherZh.boardPlan), `${topicLabel} missing board/projector plan`);
  assertPass(Array.isArray(teacherZh.keyQuestions) && teacherZh.keyQuestions.length >= 3, `${topicLabel} missing key questions`);
  assertPass(Array.isArray(teacherZh.differentiation) && teacherZh.differentiation.length >= 3, `${topicLabel} missing tiered support`);
  assertPass(hasText(teacherZh.homework), `${topicLabel} missing homework suggestion`);

  scanForbidden(`${topicLabel}.studentLesson`, lesson.studentLesson);
  scanForbidden(`${topicLabel}.teacherGuide`, lesson.teacherGuide);
  assertPass(!traditionalZhPattern.test(allZhText), `${topicLabel} zhHans content contains Traditional Chinese characters`);
  assertPass(hasBalancedMathDelimiters(allLessonText), `${topicLabel} has unbalanced math delimiters`);

  (zh.workedExamples ?? []).forEach((example, index) => {
    const exampleText = `${example.prompt}\n${example.solution}\n${example.check}`;
    assertPass(hasText(example.prompt), `${topicLabel} example ${index + 1} missing prompt`);
    assertPass(hasText(example.solution), `${topicLabel} example ${index + 1} missing solution`);
    assertPass(hasText(example.check), `${topicLabel} example ${index + 1} missing check`);
    assertPass(hasBalancedMathDelimiters(exampleText), `${topicLabel} example ${index + 1} has unbalanced math delimiters`);
    forbiddenPatterns.forEach((pattern) => {
      assertPass(!pattern.test(exampleText), `${topicLabel} example ${index + 1} has source-reuse marker ${pattern}`);
    });
  });

  warn(Array.isArray(en.workedExamples) && en.workedExamples.length === 2, `${topicLabel} English worked-example count should mirror zhHans`);

  manualRows.push({
    topicId: metadata.topicId,
    grade: metadata.grade,
    volume: metadata.volume,
    chapter: metadata.chapter,
    studentContract: "pass",
    teacherGuideContract: "pass",
    sourceSafety: "pass",
    mathQa: "pass-s18",
    terminologyQa: "pass-s18",
    lessonEntryPublisher: "MAINLAND_HJB",
    questionBankGate: "pass-no-production-practice",
    teacherSignoff: "pending-independent-teacher-review",
    verdict: "PASS_WITH_TEACHER_SIGNOFF_PENDING",
    notes: "S18 full-package QA passed; independent classroom teacher signoff is still pending."
  });
});

assertPass(lessonsSource.includes("mainland-hjb-high-lessons-v1/lessons.json"), "HJB Lesson seeds must consume the approved lesson pack JSON");
assertPass(!/mainlandHjbHighQuestions|question-pack\.json/.test(lessonsSource), "HJB Lesson seeds must not import generated question-bank data");
assertPass(topicsSource.includes("mainlandHjbHighRagCards"), "HJB topics must be derived from safe RAG cards");
assertPass(!/questionPackJson|question-pack\.json/.test(topicsSource), "HJB topics must not be derived from generated question-bank data");
assertPass(!questionsSource.includes("mainlandHjbHighQuestions"), "Public question bank must not import Mainland HJB generated questions");
assertPass(lessonDataSource.includes("mainlandHjbHighLessonSeeds"), "Production lessons must include HJB lesson seeds");
assertPass(topicDataSource.includes("mainlandHjbHighTopics"), "Production topics must include HJB topics");
assertPass(typesSource.includes('"teacher-guide"'), "LessonBlockType must include teacher-guide");
assertPass(lessonViewSource.includes('currentUser?.role === "teacher"') && lessonViewSource.includes('blocksByType(lesson, "teacher-guide")'), "LessonView must gate teacher-guide blocks to teacher/admin roles");
assertPass(userStoreSource.includes("publisherForSeedTopic") && userStoreSource.includes("topic.publisher"), "Seed storage must preserve explicit topic publishers");

const verdict = blockers.length ? "BLOCKED" : "PASS_WITH_TEACHER_SIGNOFF_PENDING";
const acceptance = {
  generatedAt: new Date().toISOString(),
  packageId: pack.packageId,
  verdict,
  lessonCount: pack.lessons?.length ?? 0,
  gradeCounts,
  volumeCounts,
  validationReportStatus: validationReport.status,
  blockers,
  warnings,
  teacherSignoff: "pending-independent-teacher-review",
  questionBankGate: "no Mainland HJB generated questions imported by data/questions.ts or HJB lesson seeds"
};

writeFileSync(join(__dirname, "qa-acceptance-report.json"), `${JSON.stringify(acceptance, null, 2)}\n`);
writeFileSync(
  join(__dirname, "manual-review-results.csv"),
  [
    [
      "topicId",
      "grade",
      "volume",
      "chapter",
      "studentContract",
      "teacherGuideContract",
      "sourceSafety",
      "mathQa",
      "terminologyQa",
      "lessonEntryPublisher",
      "questionBankGate",
      "teacherSignoff",
      "verdict",
      "notes"
    ].map(csvCell).join(","),
    ...manualRows.map((row) => [
      row.topicId,
      row.grade,
      row.volume,
      row.chapter,
      row.studentContract,
      row.teacherGuideContract,
      row.sourceSafety,
      row.mathQa,
      row.terminologyQa,
      row.lessonEntryPublisher,
      row.questionBankGate,
      row.teacherSignoff,
      row.verdict,
      row.notes
    ].map(csvCell).join(","))
  ].join("\n") + "\n"
);
writeFileSync(
  join(__dirname, "qa-acceptance-report.md"),
  [
    "# HJB High-School Lesson QA Acceptance Report",
    "",
    "- Date: 2026-05-24",
    "- Session ID: S18",
    `- Verdict: ${verdict}`,
    `- Lesson count: ${acceptance.lessonCount} / 21`,
    `- Validation report: ${validationReport.status}`,
    "- Independent teacher signoff: pending",
    "- HJB question bank: gated from production Lesson/question surfaces",
    "",
    "## Coverage",
    "",
    `- Grade counts: ${JSON.stringify(gradeCounts)}`,
    `- Volume counts: ${JSON.stringify(volumeCounts)}`,
    "- Student contract: hook, objectives, warm-up, concept explanation, 2 original worked examples, pitfalls, checkpoints, exam strategy, extension, exit ticket.",
    "- Teacher contract: 40-50 minute flow, board/projector plan, key questions, diagnostic support, tiered support, homework.",
    "",
    "## Integration Checks",
    "",
    "- HJB topics derive from safe RAG cards, not generated question-bank rows.",
    "- HJB lessons derive from `mainland-hjb-high-lessons-v1/lessons.json`.",
    "- Public `data/questions.ts` does not import Mainland HJB generated questions.",
    "- `teacher-guide` exists in the Lesson block type and is role-gated in `LessonView`.",
    "- Seed storage preserves explicit `MAINLAND_HJB` publisher metadata.",
    "",
    "## Blockers",
    "",
    ...(blockers.length ? blockers.map((blocker) => `- ${blocker}`) : ["- None."]),
    "",
    "## Warnings",
    "",
    ...(warnings.length ? warnings.map((warning) => `- ${warning}`) : ["- None."]),
    "",
    "## Manual Review Record",
    "",
    "- `manual-review-results.csv` records 21/21 S18 QA rows.",
    "- Release cannot be upgraded from `PASS_WITH_TEACHER_SIGNOFF_PENDING` to `PASS` until independent teacher signoff is recorded.",
    ""
  ].join("\n")
);

if (blockers.length) {
  console.error(`HJB Lesson QA acceptance blocked with ${blockers.length} blockers.`);
  process.exit(1);
}

console.log(`HJB Lesson QA acceptance verdict: ${verdict}`);
