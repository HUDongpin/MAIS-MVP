#!/usr/bin/env node

/**
 * Structural inventory gate for the three live California math exercise packs.
 *
 * This audit intentionally does not solve questions or inspect explanations,
 * independent solutions, generation parameters, or hidden answer derivations.
 * It checks only inventory/schema integrity, answer discoverability in visible
 * choices or accepted-answer lists, and the presence of data needed by prompts
 * that refer to graphs, plots, tables, or diagrams.
 */

import { readFileSync } from "node:fs";

const EXPECTED_CCSS_GRADE_SPAN = Object.freeze([
  "K",
  "P1",
  "P2",
  "P3",
  "P4",
  "P5",
  "P6",
  "S1",
  "S2",
  "S3",
  "S4",
  "S5",
  "S6"
]);

const PACKS = Object.freeze([
  {
    packageId: "us-ca-k5-knowledge-point-practice-v1",
    expectedCount: 492,
    url: new URL(
      "../data/generated-content/us-ca-k5-knowledge-point-practice-v1/question-pack.json",
      import.meta.url
    )
  },
  {
    packageId: "ccss-textbook-practice-v1",
    expectedCount: 810,
    expectedGradeSpan: EXPECTED_CCSS_GRADE_SPAN,
    url: new URL(
      "../data/generated-content/ccss-textbook-practice-v1/question-pack.json",
      import.meta.url
    )
  },
  {
    packageId: "us-ca-math-g6-g12-generated-bank-v2-1500",
    expectedCount: 1500,
    url: new URL(
      "../data/generated-content/us-ca-math-g6-g12-generated-bank-v2-1500/question-pack.json",
      import.meta.url
    )
  }
]);

const EXPECTED_TOTAL = 2802;
const EXPECTED_CURRICULUM_TRACK = "US_CA_MATH";
const EXPECTED_STATE = "CA";
const LEGAL_GRADES = new Set([
  "K",
  "P1",
  "P2",
  "P3",
  "P4",
  "P5",
  "P6",
  "S1",
  "S2",
  "S3",
  "S4",
  "S5",
  "S6"
]);
const LEGAL_TYPES = new Set(["multiple-choice", "fill-in", "short-answer"]);

function normalizeText(value) {
  if (typeof value !== "string" && typeof value !== "number") return null;
  if (typeof value === "number" && !Number.isFinite(value)) return null;

  const normalized = String(value)
    .normalize("NFKC")
    .replace(/[−–—]/g, "-")
    .replace(/×/g, "x")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  return normalized === "" ? null : normalized;
}

function optionEnglish(option) {
  if (option && typeof option === "object" && !Array.isArray(option)) {
    return normalizeText(option.en);
  }
  return normalizeText(option);
}

function isNonEmptyString(value) {
  return typeof value === "string" && normalizeText(value) !== null;
}

function isCompleteScalarArray(value) {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((entry) => normalizeText(entry) !== null)
  );
}

function isCompleteIdArray(value) {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((entry) => isNonEmptyString(entry))
  );
}

function referencesDataDisplay(prompt) {
  return (
    /\bgraphs?\b/i.test(prompt) ||
    /\bline plots?\b/i.test(prompt) ||
    /\bpicture graphs?\b/i.test(prompt) ||
    /\bdiagrams?\b/i.test(prompt) ||
    /\btables?\b/i.test(prompt)
  );
}

function localizedEnglishText(value) {
  return normalizeText(value?.en ?? value);
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function isRenderablePayloadEntry(value) {
  if (isFiniteNumber(value) || isNonEmptyString(value)) return true;
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0
  );
}

function hasStudentVisibleDiagram(diagram) {
  if (!diagram || typeof diagram !== "object" || Array.isArray(diagram)) return false;

  const kind = normalizeText(diagram.kind);
  const display = normalizeText(diagram.display);
  if (kind === null && display === null) return false;

  if (kind === "data-display") {
    if (localizedEnglishText(diagram.title) === null) return false;
    if (localizedEnglishText(diagram.unit) === null) return false;

    if (display === "picture-graph" || display === "bar-graph") {
      const categories = diagram.categories;
      if (!Array.isArray(categories) || categories.length === 0) return false;
      if (
        !categories.every(
          (category) =>
            category !== null &&
            typeof category === "object" &&
            !Array.isArray(category) &&
            localizedEnglishText(category.label) !== null &&
            isFiniteNumber(category.value)
        )
      ) {
        return false;
      }
      return diagram.scale === undefined || (isFiniteNumber(diagram.scale) && diagram.scale > 0);
    }

    if (display === "line-plot") {
      const values = diagram.values;
      const range = diagram.range;
      if (!Array.isArray(values) || values.length === 0 || !values.every(isFiniteNumber)) {
        return false;
      }
      if (
        !Array.isArray(range) ||
        range.length !== 2 ||
        !range.every(isFiniteNumber) ||
        range[0] >= range[1]
      ) {
        return false;
      }
      if (!isFiniteNumber(diagram.tickInterval) || diagram.tickInterval <= 0) return false;
      return values.every((value) => value >= range[0] && value <= range[1]);
    }

    return false;
  }

  const arrayPayloadKeys = [
    "categories",
    "values",
    "points",
    "rows",
    "columns",
    "cells",
    "segments",
    "shapes",
    "items",
    "data"
  ];
  const hasArrayPayload = arrayPayloadKeys.some(
    (key) =>
      Array.isArray(diagram[key]) &&
      diagram[key].length > 0 &&
      diagram[key].every(isRenderablePayloadEntry)
  );
  const hasMediaPayload = ["svg", "image", "imageUrl", "src", "content"].some(
    (key) => normalizeText(diagram[key]) !== null
  );

  return hasArrayPayload || hasMediaPayload;
}

function requiresExternalDisplay(prompt) {
  const display = String.raw`(?:graphs?|line plots?|picture graphs?|diagrams?|tables?)`;
  return (
    new RegExp(String.raw`\buse\s+(?:the|this|that|following)\s+${display}\b`, "i").test(
      prompt
    ) ||
    new RegExp(
      String.raw`\b(?:according to|from|refer to|look at|shown in|shown on)\s+(?:the|this|that|following)\s+${display}\b`,
      "i"
    ).test(prompt) ||
    new RegExp(
      String.raw`\b(?:a|an|the|this|that|following)\s+${display}\s+(?:below|above|shown|provided|given|displays?|shows?|lists?|contains?)\b`,
      "i"
    ).test(prompt) ||
    new RegExp(
      String.raw`\b(?:on|in|from|based on)\s+(?:the|this|that|following)\s+${display}\b[^.!?]*(?:\bwhat\b|\bwhich\b|\bhow\b|\bfind\b|\bdetermine\b|\bread\b|\bestimate\b)`,
      "i"
    ).test(prompt)
  );
}

function hasCompleteInlineDisplayData(prompt) {
  // Explicit category/value statements, such as "A picture graph shows
  // 5 apples and 2 oranges", carry the full data without a separate visual.
  const numericTokens = prompt.match(/(?<![A-Za-z])\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)?/g) ?? [];
  const explicitDataStatement =
    /\b(?:shows?|displays?|lists?|gives?|contains?|records?|has)\b/i.test(prompt);
  if (numericTokens.length >= 2 && explicitDataStatement) return true;

  // A relation defines a graph only when the prompt supplies that relation as
  // the graph itself. A bare condition inside a request such as
  // "On the graph, what is y when x = 2?" does not supply the missing graph.
  const hasInlineRelation = /(?:=|≥|≤|>|<)/.test(prompt);
  const relationDefinesDisplay =
    /\bgraphs?\s+of\b[^.!?]*(?:=|≥|≤|>|<)/i.test(prompt) ||
    /\b(?:equation|inequality|relation|function)\b[^.!?]*(?:=|≥|≤|>|<)/i.test(prompt);
  if (hasInlineRelation && relationDefinesDisplay) return true;

  // Definition/concept prompts such as "On a line plot, each X stands for…"
  // mention a display type but do not direct the learner to an absent display.
  return !requiresExternalDisplay(prompt);
}

function assertSelfTest(condition, message) {
  if (!condition) throw new Error(`SELF_TEST_FAILED: ${message}`);
}

function runSelfTests() {
  const validLinePlot = {
    kind: "data-display",
    display: "line-plot",
    title: { en: "Measured lengths" },
    unit: { en: "inches" },
    values: [1, 1.25, 1.5],
    range: [1, 2],
    tickInterval: 0.25
  };
  const malformedLinePlot = {
    ...validLinePlot,
    values: [null]
  };

  assertSelfTest(hasStudentVisibleDiagram(validLinePlot), "valid line plot must render");
  assertSelfTest(
    !hasStudentVisibleDiagram(malformedLinePlot),
    "line plot with null data must not count as student-visible"
  );
  assertSelfTest(
    !hasCompleteInlineDisplayData("On the graph, what is y when x = 2?"),
    "a bare x condition must not replace an absent graph"
  );
  assertSelfTest(
    !hasCompleteInlineDisplayData("A graph displays student scores. What is the median?"),
    "a graph description without scores must not count as inline data"
  );
  assertSelfTest(
    hasCompleteInlineDisplayData(
      "A picture graph shows 5 apples and 2 oranges. Which fruit has more?"
    ),
    "explicit category/value data must remain self-contained"
  );
  assertSelfTest(
    hasCompleteInlineDisplayData("On the graph of x ≥ 2, the circle at 2 is closed."),
    "a fully supplied graph relation must remain self-contained"
  );
  assertSelfTest(
    hasExactGradeSpan(EXPECTED_CCSS_GRADE_SPAN, EXPECTED_CCSS_GRADE_SPAN),
    "the exact K-S6 grade span must pass"
  );
  assertSelfTest(
    !hasExactGradeSpan(EXPECTED_CCSS_GRADE_SPAN.slice(0, -1), EXPECTED_CCSS_GRADE_SPAN),
    "a truncated CCSS grade span must fail"
  );

  console.log("PASS: inventory display mutation self-tests rejected incomplete and malformed data.");
}

function pushError(errors, id, code, detail, packageId) {
  errors.push({ id, code, detail, packageId });
}

function hasExactGradeSpan(actual, expected) {
  return (
    Array.isArray(actual) &&
    actual.length === expected.length &&
    actual.every((grade, index) => grade === expected[index])
  );
}

function auditQuestion(question, index, config, errors, idOwners, stats) {
  const fallbackId = `<${config.packageId}#${index + 1}>`;
  const id = isNonEmptyString(question?.id) ? question.id.trim() : fallbackId;

  if (id === fallbackId) {
    pushError(errors, id, "MISSING_ID", "id must be a non-empty string", config.packageId);
  } else {
    const priorPackage = idOwners.get(id);
    if (priorPackage) {
      pushError(
        errors,
        id,
        "DUPLICATE_ID",
        `ID occurs in both ${priorPackage} and ${config.packageId}`,
        config.packageId
      );
    } else {
      idOwners.set(id, config.packageId);
    }
  }

  if (question?.curriculumTrack !== EXPECTED_CURRICULUM_TRACK) {
    pushError(
      errors,
      id,
      "INVALID_CURRICULUM_TRACK",
      `found ${JSON.stringify(question?.curriculumTrack)}; expected ${EXPECTED_CURRICULUM_TRACK}`,
      config.packageId
    );
  }

  if (question?.state !== EXPECTED_STATE) {
    pushError(
      errors,
      id,
      "INVALID_STATE",
      `found ${JSON.stringify(question?.state)}; expected ${EXPECTED_STATE}`,
      config.packageId
    );
  }

  if (!LEGAL_GRADES.has(question?.grade)) {
    pushError(
      errors,
      id,
      "INVALID_GRADE",
      `found ${JSON.stringify(question?.grade)}; legal grades are ${[...LEGAL_GRADES].join(", ")}`,
      config.packageId
    );
  }

  const promptEn = question?.prompt?.en;
  if (!isNonEmptyString(promptEn)) {
    pushError(
      errors,
      id,
      "MISSING_PROMPT_EN",
      "prompt.en must be a non-empty string",
      config.packageId
    );
  }

  const normalizedAnswer = normalizeText(question?.answer);
  if (normalizedAnswer === null) {
    pushError(
      errors,
      id,
      "MISSING_ANSWER",
      "answer must be a non-empty string or finite number",
      config.packageId
    );
  }

  if (!isCompleteScalarArray(question?.acceptedAnswers)) {
    pushError(
      errors,
      id,
      "INCOMPLETE_ACCEPTED_ANSWERS",
      "acceptedAnswers must be a non-empty array of non-empty strings or finite numbers",
      config.packageId
    );
  }

  for (const field of ["standardIds", "sourceIds"]) {
    if (isCompleteIdArray(question?.[field])) continue;
    pushError(
      errors,
      id,
      `INCOMPLETE_${field.replace(/([A-Z])/g, "_$1").toUpperCase()}`,
      `${field} must be a non-empty array of non-empty strings`,
      config.packageId
    );
  }

  if (!LEGAL_TYPES.has(question?.type)) {
    pushError(
      errors,
      id,
      "INVALID_TYPE",
      `found ${JSON.stringify(question?.type)}; expected multiple-choice, fill-in, or short-answer`,
      config.packageId
    );
  }

  if (question?.type === "multiple-choice") {
    stats.multipleChoice += 1;
    const options = Array.isArray(question.options) ? question.options : [];
    const normalizedOptions = options.map(optionEnglish);

    if (options.length !== 4) {
      pushError(
        errors,
        id,
        "MC_OPTION_COUNT",
        `found ${options.length} options; expected exactly 4`,
        config.packageId
      );
    }

    if (normalizedOptions.some((option) => option === null)) {
      pushError(
        errors,
        id,
        "MC_EMPTY_OPTION_EN",
        "every option must have non-empty student-visible English text",
        config.packageId
      );
    }

    const nonEmptyOptions = normalizedOptions.filter((option) => option !== null);
    if (new Set(nonEmptyOptions).size !== nonEmptyOptions.length) {
      pushError(
        errors,
        id,
        "MC_DUPLICATE_OPTIONS",
        "the 4 options must remain distinct after normalization",
        config.packageId
      );
    }

    const answerMatches = normalizedOptions.filter(
      (option) => option !== null && option === normalizedAnswer
    ).length;
    if (answerMatches !== 1) {
      pushError(
        errors,
        id,
        "MC_ANSWER_MATCH_COUNT",
        `normalized answer matches ${answerMatches} options; expected exactly 1`,
        config.packageId
      );
    }
  }

  if (question?.type === "fill-in" || question?.type === "short-answer") {
    if (question.type === "fill-in") stats.fillIn += 1;
    else stats.shortAnswer += 1;
    const accepted = Array.isArray(question.acceptedAnswers)
      ? question.acceptedAnswers.map(normalizeText)
      : [];
    if (
      normalizedAnswer !== null &&
      !accepted.some((candidate) => candidate !== null && candidate === normalizedAnswer)
    ) {
      pushError(
        errors,
        id,
        "FREE_RESPONSE_ANSWER_NOT_ACCEPTED",
        "normalized answer must occur in acceptedAnswers",
        config.packageId
      );
    }
  }

  if (typeof promptEn === "string" && referencesDataDisplay(promptEn)) {
    stats.displayReferences += 1;
    if (hasStudentVisibleDiagram(question.diagram)) {
      stats.diagramBacked += 1;
    } else if (hasCompleteInlineDisplayData(promptEn)) {
      stats.inlineDataBacked += 1;
    } else {
      pushError(
        errors,
        id,
        "MISSING_VISIBLE_DISPLAY_DATA",
        "prompt depends on a graph, line plot, picture graph, table, or diagram but supplies neither a student-visible diagram nor complete inline data",
        config.packageId
      );
    }
  }
}

function main() {
  const errors = [];
  const idOwners = new Map();
  const loadedPacks = [];
  const stats = {
    questions: 0,
    multipleChoice: 0,
    fillIn: 0,
    shortAnswer: 0,
    displayReferences: 0,
    diagramBacked: 0,
    inlineDataBacked: 0
  };

  for (const config of PACKS) {
    let pack;
    try {
      pack = JSON.parse(readFileSync(config.url, "utf8"));
    } catch (error) {
      pushError(
        errors,
        `<${config.packageId}>`,
        "PACK_READ_FAILURE",
        error.message,
        config.packageId
      );
      continue;
    }

    loadedPacks.push({ config, pack });

    if (pack?.packageId !== config.packageId) {
      pushError(
        errors,
        `<${config.packageId}>`,
        "PACKAGE_ID_MISMATCH",
        `found ${JSON.stringify(pack?.packageId)}; expected ${config.packageId}`,
        config.packageId
      );
    }
    if (pack?.curriculumTrack !== EXPECTED_CURRICULUM_TRACK) {
      pushError(
        errors,
        `<${config.packageId}>`,
        "PACK_CURRICULUM_TRACK_MISMATCH",
        `found ${JSON.stringify(pack?.curriculumTrack)}; expected ${EXPECTED_CURRICULUM_TRACK}`,
        config.packageId
      );
    }
    if (pack?.state !== EXPECTED_STATE) {
      pushError(
        errors,
        `<${config.packageId}>`,
        "PACK_STATE_MISMATCH",
        `found ${JSON.stringify(pack?.state)}; expected ${EXPECTED_STATE}`,
        config.packageId
      );
    }

    const questions = pack?.questions;
    if (!Array.isArray(questions)) {
      pushError(
        errors,
        `<${config.packageId}>`,
        "MISSING_QUESTIONS_ARRAY",
        "pack must contain a questions array",
        config.packageId
      );
      continue;
    }

    if (questions.length !== config.expectedCount) {
      pushError(
        errors,
        `<${config.packageId}>`,
        "PACK_COUNT_MISMATCH",
        `found ${questions.length}; expected ${config.expectedCount}`,
        config.packageId
      );
    }

    const declaredGradeSpan = pack?.scope?.gradeSpan ?? pack?.gradeSpan;
    const actualGrades = [...new Set(questions.map((question) => question?.grade))].sort();
    const declaredGrades = Array.isArray(declaredGradeSpan)
      ? [...new Set(declaredGradeSpan)].sort()
      : [];
    if (
      declaredGrades.length === 0 ||
      declaredGrades.length !== actualGrades.length ||
      declaredGrades.some((grade, index) => grade !== actualGrades[index])
    ) {
      pushError(
        errors,
        `<${config.packageId}>`,
        "PACK_GRADE_SPAN_MISMATCH",
        `declared ${JSON.stringify(declaredGradeSpan)}; actual ${JSON.stringify(actualGrades)}`,
        config.packageId
      );
    }
    if (config.expectedGradeSpan) {
      const actualGradeSet = new Set(questions.map((question) => question?.grade));
      const actualExpectedOrder = config.expectedGradeSpan.filter((grade) => actualGradeSet.has(grade));
      const hasUnexpectedGrade = [...actualGradeSet].some(
        (grade) => !config.expectedGradeSpan.includes(grade)
      );
      if (
        !hasExactGradeSpan(declaredGradeSpan, config.expectedGradeSpan) ||
        !hasExactGradeSpan(actualExpectedOrder, config.expectedGradeSpan) ||
        hasUnexpectedGrade
      ) {
        pushError(
          errors,
          `<${config.packageId}>`,
          "PACK_EXPECTED_GRADE_SPAN_MISMATCH",
          `declared ${JSON.stringify(declaredGradeSpan)}; actual ${JSON.stringify([...actualGradeSet])}; expected ${JSON.stringify(config.expectedGradeSpan)}`,
          config.packageId
        );
      }
    }

    stats.questions += questions.length;
    questions.forEach((question, index) =>
      auditQuestion(question, index, config, errors, idOwners, stats)
    );
  }

  if (stats.questions !== EXPECTED_TOTAL) {
    pushError(
      errors,
      "<all-ca-live-packs>",
      "TOTAL_COUNT_MISMATCH",
      `found ${stats.questions}; expected 492 + 810 + 1500 = ${EXPECTED_TOTAL}`,
      "all"
    );
  }

  const classifiedQuestions =
    stats.multipleChoice + stats.fillIn + stats.shortAnswer;
  if (classifiedQuestions !== stats.questions) {
    pushError(
      errors,
      "<all-ca-live-packs>",
      "TYPE_CLASSIFICATION_MISMATCH",
      `classified ${classifiedQuestions} of ${stats.questions} questions`,
      "all"
    );
  }

  const errorIds = [...new Set(errors.map((error) => error.id))];
  const countSummary = loadedPacks
    .map(({ config, pack }) => `${config.packageId}=${Array.isArray(pack?.questions) ? pack.questions.length : "missing"}`)
    .join(", ");

  console.log("US-CA live exercise inventory gate");
  console.log(`packs: ${loadedPacks.length}/${PACKS.length}`);
  console.log(`pack_counts: ${countSummary || "none"}`);
  console.log(`questions: ${stats.questions}/${EXPECTED_TOTAL}`);
  console.log(`unique_ids: ${idOwners.size}/${EXPECTED_TOTAL}`);
  console.log(`multiple_choice: ${stats.multipleChoice}`);
  console.log(`fill_in: ${stats.fillIn}`);
  console.log(`short_answer: ${stats.shortAnswer}`);
  console.log(`display_references: ${stats.displayReferences}`);
  console.log(`diagram_backed: ${stats.diagramBacked}`);
  console.log(`inline_data_backed: ${stats.inlineDataBacked}`);
  console.log(`errors: ${errors.length}`);
  console.log(`error_ids: ${errorIds.length === 0 ? "none" : errorIds.join(", ")}`);

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(
        `FAIL ${error.id} [${error.code}] (${error.packageId}) ${error.detail}`
      );
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    "PASS: all 2,802 live California exercises satisfy inventory, option, accepted-answer, and visible-data requirements."
  );
}

if (process.argv.includes("--self-test")) {
  runSelfTests();
} else {
  main();
}
