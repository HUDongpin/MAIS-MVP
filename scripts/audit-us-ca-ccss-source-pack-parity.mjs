#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath } from "node:url";

/**
 * Audit immutable source-to-generated parity for the CCSS textbook practice pack.
 *
 * Allowed generator additions:
 * - extra multiple-choice distractors;
 * - curated accepted-answer aliases.
 *
 * Required exact source parity:
 * - one generated q01/q02/q03 per sourceLessonSlug;
 * - prompt.en;
 * - every source MC choice and the source-selected main answer;
 * - numeric main-answer string;
 * - explanation.en;
 * - the complete student-visible diagram, when present;
 * - acceptedAnswers containing the generated main answer.
 */

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(SCRIPT_DIR, "..");
const SOURCE_PATH = resolve(
  ROOT_DIR,
  "data/generated-content/ccss-textbook-source-v1/source.json",
);
const PACK_PATH = resolve(
  ROOT_DIR,
  "data/generated-content/ccss-textbook-practice-v1/question-pack.json",
);

const EXPECTED_SLUGS = 270;
const QUESTIONS_PER_SLUG = 3;
const EXPECTED_QUESTIONS = EXPECTED_SLUGS * QUESTIONS_PER_SLUG;
const PACK_ID = "ccss-textbook-practice-v1";
const EXPECTED_GRADE_SPAN = [
  "K", "P1", "P2", "P3", "P4", "P5", "P6",
  "S1", "S2", "S3", "S4", "S5", "S6",
];
const QUESTION_ID_PATTERN =
  /^ccss-textbook-practice-v1-(.+)-(q\d{2})$/;

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function text(value) {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (value && typeof value === "object" && value.en != null) {
    return String(value.en);
  }
  return "";
}

function expectedQuestionId(slug, questionLabel) {
  return `${PACK_ID}-${slug}-${questionLabel}`;
}

function mappingKey(slug, questionLabel) {
  return `${slug}\u0000${questionLabel}`;
}

function displayValue(value, limit = 220) {
  const serialized = JSON.stringify(value);
  if (serialized == null) return String(value);
  return serialized.length <= limit
    ? serialized
    : `${serialized.slice(0, limit - 1)}…`;
}

const issues = [];

function report(category, id, field, message) {
  issues.push({ category, id, field, message });
}

function reportStrictMismatch(id, field, expected, actual) {
  if (expected === actual) return;
  report(
    "parity",
    id,
    field,
    `expected ${displayValue(expected)}, got ${displayValue(actual)}`,
  );
}

function duplicateStrings(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value]) => value);
}

const source = readJson(SOURCE_PATH);
const pack = readJson(PACK_PATH);

const sourceLessons = Array.isArray(source.lessons) ? source.lessons : [];
const practiceBySlug =
  source.practiceBySlug &&
  typeof source.practiceBySlug === "object" &&
  !Array.isArray(source.practiceBySlug)
    ? source.practiceBySlug
    : {};
const generatedQuestions = Array.isArray(pack.questions) ? pack.questions : [];

if (!Array.isArray(source.lessons)) {
  report("inventory", "<source>", "lessons", "lessons must be an array");
}
if (sourceLessons.length !== EXPECTED_SLUGS) {
  report(
    "inventory",
    "<source>",
    "lessons",
    `expected ${EXPECTED_SLUGS} lessons, found ${sourceLessons.length}`,
  );
}
if (Object.keys(practiceBySlug).length !== EXPECTED_SLUGS) {
  report(
    "inventory",
    "<source>",
    "practiceBySlug",
    `expected ${EXPECTED_SLUGS} slugs, found ${Object.keys(practiceBySlug).length}`,
  );
}
if (generatedQuestions.length !== EXPECTED_QUESTIONS) {
  report(
    "inventory",
    "<pack>",
    "questions",
    `expected ${EXPECTED_QUESTIONS} questions, found ${generatedQuestions.length}`,
  );
}
if (pack.packageId !== PACK_ID) {
  report(
    "inventory",
    "<pack>",
    "packageId",
    `expected ${PACK_ID}, found ${displayValue(pack.packageId)}`,
  );
}
if (!isDeepStrictEqual(pack.scope?.gradeSpan, EXPECTED_GRADE_SPAN)) {
  report(
    "inventory",
    "<pack>",
    "scope.gradeSpan",
    `expected ${displayValue(EXPECTED_GRADE_SPAN)}, found ${displayValue(pack.scope?.gradeSpan)}`,
  );
}

const lessonSlugCounts = new Map();
for (let index = 0; index < sourceLessons.length; index += 1) {
  const slug = text(sourceLessons[index]?.slug);
  if (!slug) {
    report("inventory", `<source-lesson-index:${index}>`, "slug", "missing lesson slug");
    continue;
  }
  lessonSlugCounts.set(slug, (lessonSlugCounts.get(slug) ?? 0) + 1);
}
for (const [slug, count] of lessonSlugCounts) {
  if (count > 1) {
    report("duplicate", `source:${slug}`, "lesson slug", `appears ${count} times`);
  }
}

const lessonSlugSet = new Set(lessonSlugCounts.keys());
const practiceSlugSet = new Set(Object.keys(practiceBySlug));
for (const slug of lessonSlugSet) {
  if (!practiceSlugSet.has(slug)) {
    report("missing", `source:${slug}`, "practiceBySlug", "lesson has no practice entry");
  }
}
for (const slug of practiceSlugSet) {
  if (!lessonSlugSet.has(slug)) {
    report("extra", `source:${slug}`, "practiceBySlug", "practice slug has no lesson record");
  }
}

const sourceByKey = new Map();
let sourceQuestionCount = 0;
for (const [slug, sourceQuestions] of Object.entries(practiceBySlug)) {
  if (!Array.isArray(sourceQuestions)) {
    report("inventory", `source:${slug}`, "questions", "practice entry must be an array");
    continue;
  }
  sourceQuestionCount += sourceQuestions.length;
  if (sourceQuestions.length !== QUESTIONS_PER_SLUG) {
    report(
      "inventory",
      `source:${slug}`,
      "questions",
      `expected ${QUESTIONS_PER_SLUG} questions, found ${sourceQuestions.length}`,
    );
  }

  for (let index = 0; index < QUESTIONS_PER_SLUG; index += 1) {
    if (sourceQuestions[index] == null) {
      const questionLabel = `q${String(index + 1).padStart(2, "0")}`;
      report(
        "missing",
        expectedQuestionId(slug, questionLabel),
        "source question",
        "source practice slot is absent",
      );
    }
  }

  for (let index = 0; index < sourceQuestions.length; index += 1) {
    const questionLabel = `q${String(index + 1).padStart(2, "0")}`;
    const id = expectedQuestionId(slug, questionLabel);
    const key = mappingKey(slug, questionLabel);
    if (sourceQuestions[index] == null) continue;
    if (sourceByKey.has(key)) {
      report("duplicate", id, "source mapping", "duplicate source slug/question mapping");
      continue;
    }
    sourceByKey.set(key, {
      id,
      slug,
      questionLabel,
      question: sourceQuestions[index],
    });
    if (index >= QUESTIONS_PER_SLUG) {
      report("extra", id, "source question", "only q01 through q03 are allowed");
    }
  }
}
if (sourceQuestionCount !== EXPECTED_QUESTIONS) {
  report(
    "inventory",
    "<source>",
    "question total",
    `expected ${EXPECTED_QUESTIONS}, found ${sourceQuestionCount}`,
  );
}

const generatedIdCounts = new Map();
const generatedByKey = new Map();
for (let index = 0; index < generatedQuestions.length; index += 1) {
  const question = generatedQuestions[index];
  const id = text(question?.id) || `<pack-question-index:${index}>`;
  generatedIdCounts.set(id, (generatedIdCounts.get(id) ?? 0) + 1);

  const idMatch = id.match(QUESTION_ID_PATTERN);
  if (!idMatch) {
    report("mapping", id, "id", "does not match the pack slug/qNN ID contract");
    continue;
  }
  const idSlug = idMatch[1];
  const questionLabel = idMatch[2];
  const sourceLessonSlug = text(question?.sourceLessonSlug);

  if (!/^q0[1-3]$/.test(questionLabel)) {
    report("extra", id, "question label", "only q01 through q03 are allowed");
  }
  if (!sourceLessonSlug) {
    report("mapping", id, "sourceLessonSlug", "missing source lesson slug");
    continue;
  }
  if (idSlug !== sourceLessonSlug) {
    report(
      "mapping",
      id,
      "sourceLessonSlug",
      `ID encodes ${displayValue(idSlug)}, field contains ${displayValue(sourceLessonSlug)}`,
    );
  }

  const canonicalId = expectedQuestionId(sourceLessonSlug, questionLabel);
  if (id !== canonicalId) {
    report(
      "mapping",
      id,
      "id",
      `canonical ID for its source mapping is ${canonicalId}`,
    );
  }

  const key = mappingKey(sourceLessonSlug, questionLabel);
  const mapped = generatedByKey.get(key) ?? [];
  mapped.push({ id, question });
  generatedByKey.set(key, mapped);
}

for (const [id, count] of generatedIdCounts) {
  if (count > 1) {
    report("duplicate", id, "generated ID", `appears ${count} times`);
  }
}

for (const [key, sourceRecord] of sourceByKey) {
  const generated = generatedByKey.get(key) ?? [];
  if (generated.length === 0) {
    report("missing", sourceRecord.id, "generated mapping", "no generated question");
  } else if (generated.length > 1) {
    report(
      "duplicate",
      sourceRecord.id,
      "generated mapping",
      `${generated.length} generated questions map to this source slot: ${generated
        .map((entry) => entry.id)
        .join(", ")}`,
    );
  }
}
for (const [key, generated] of generatedByKey) {
  if (!sourceByKey.has(key)) {
    for (const entry of generated) {
      report("extra", entry.id, "generated mapping", "no corresponding source slug/q slot");
    }
  }
}

let comparedPairs = 0;
for (const [key, sourceRecord] of sourceByKey) {
  const generated = generatedByKey.get(key) ?? [];
  if (generated.length !== 1) continue;

  comparedPairs += 1;
  const id = generated[0].id;
  const sourceQuestion = sourceRecord.question;
  const generatedQuestion = generated[0].question;

  reportStrictMismatch(id, "prompt.en", sourceQuestion?.prompt, generatedQuestion?.prompt?.en);
  reportStrictMismatch(
    id,
    "explanation.en",
    sourceQuestion?.explanation,
    generatedQuestion?.explanation?.en,
  );

  if (!isDeepStrictEqual(sourceQuestion?.diagram, generatedQuestion?.diagram)) {
    report(
      "parity",
      id,
      "diagram",
      `deep mismatch: source=${displayValue(sourceQuestion?.diagram)}, generated=${displayValue(generatedQuestion?.diagram)}`,
    );
  }

  if (sourceQuestion?.kind === "mc") {
    reportStrictMismatch(id, "type", "multiple-choice", generatedQuestion?.type);

    if (!Array.isArray(sourceQuestion.choices)) {
      report("source", id, "choices", "MC source question has no choices array");
    } else {
      const sourceChoices = sourceQuestion.choices.map(String);
      const sourceChoiceDuplicates = duplicateStrings(sourceChoices);
      if (sourceChoiceDuplicates.length > 0) {
        report(
          "duplicate",
          id,
          "source choices",
          `duplicate source choices: ${sourceChoiceDuplicates.map(displayValue).join(", ")}`,
        );
      }

      const generatedOptions = Array.isArray(generatedQuestion?.options)
        ? generatedQuestion.options.map(text)
        : [];
      if (!Array.isArray(generatedQuestion?.options)) {
        report("parity", id, "options", "generated MC question has no options array");
      }
      const generatedOptionDuplicates = duplicateStrings(generatedOptions);
      if (generatedOptionDuplicates.length > 0) {
        report(
          "duplicate",
          id,
          "generated options",
          `duplicate English options: ${generatedOptionDuplicates.map(displayValue).join(", ")}`,
        );
      }

      for (const sourceChoice of sourceChoices) {
        const occurrences = generatedOptions.filter(
          (generatedOption) => generatedOption === sourceChoice,
        ).length;
        if (occurrences === 0) {
          report(
            "parity",
            id,
            "options",
            `missing source choice ${displayValue(sourceChoice)}`,
          );
        } else if (occurrences > 1) {
          report(
            "duplicate",
            id,
            "options",
            `source choice ${displayValue(sourceChoice)} occurs ${occurrences} times`,
          );
        }
      }

      if (
        !Number.isInteger(sourceQuestion.answer) ||
        sourceQuestion.answer < 0 ||
        sourceQuestion.answer >= sourceChoices.length
      ) {
        report(
          "source",
          id,
          "answer",
          `MC source answer index ${displayValue(sourceQuestion.answer)} is out of range`,
        );
      } else {
        reportStrictMismatch(
          id,
          "answer",
          sourceChoices[sourceQuestion.answer],
          generatedQuestion?.answer,
        );
      }
    }
  } else if (sourceQuestion?.kind === "numeric") {
    reportStrictMismatch(id, "type", "fill-in", generatedQuestion?.type);
    if (typeof generatedQuestion?.answer !== "string") {
      report(
        "parity",
        id,
        "answer type",
        `numeric generated answer must be a string, got ${typeof generatedQuestion?.answer}`,
      );
    }
    reportStrictMismatch(
      id,
      "answer",
      String(sourceQuestion?.answer),
      generatedQuestion?.answer,
    );
  } else {
    report(
      "source",
      id,
      "kind",
      `unsupported source question kind ${displayValue(sourceQuestion?.kind)}`,
    );
  }

  if (!Array.isArray(generatedQuestion?.acceptedAnswers)) {
    report("parity", id, "acceptedAnswers", "must be an array containing the main answer");
  } else {
    if (!generatedQuestion.acceptedAnswers.includes(generatedQuestion.answer)) {
      report(
        "parity",
        id,
        "acceptedAnswers",
        `does not contain main answer ${displayValue(generatedQuestion.answer)}`,
      );
    }
    const acceptedDuplicates = duplicateStrings(
      generatedQuestion.acceptedAnswers.map(String),
    );
    if (acceptedDuplicates.length > 0) {
      report(
        "duplicate",
        id,
        "acceptedAnswers",
        `duplicate aliases: ${acceptedDuplicates.map(displayValue).join(", ")}`,
      );
    }
  }
}

const categoryCounts = new Map();
for (const issue of issues) {
  categoryCounts.set(issue.category, (categoryCounts.get(issue.category) ?? 0) + 1);
}

console.log("US California CCSS source-to-practice parity audit");
console.log(`source: ${SOURCE_PATH}`);
console.log(`generated pack: ${PACK_PATH}`);
console.log(`source lessons: ${sourceLessons.length}/${EXPECTED_SLUGS}`);
console.log(`source practice slugs: ${Object.keys(practiceBySlug).length}/${EXPECTED_SLUGS}`);
console.log(`source questions: ${sourceQuestionCount}/${EXPECTED_QUESTIONS}`);
console.log(`generated questions: ${generatedQuestions.length}/${EXPECTED_QUESTIONS}`);
console.log(`one-to-one pairs compared: ${comparedPairs}/${EXPECTED_QUESTIONS}`);
console.log(`issues: ${issues.length}`);

if (issues.length > 0) {
  console.log(
    `issue categories: ${[...categoryCounts.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([category, count]) => `${category}=${count}`)
      .join(", ")}`,
  );
  for (const issue of issues) {
    console.log(`- [${issue.category}] ${issue.id} :: ${issue.field} :: ${issue.message}`);
  }
  console.error(`\nFAIL: ${issues.length} source-to-generated parity issue(s).`);
  process.exitCode = 1;
} else {
  console.log(
    "\nPASS: 270 source slugs × 3 questions map one-to-one to 810 generated questions with core-field parity.",
  );
}
