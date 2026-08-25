#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Independent K-P5 correctness gate for the CCSS textbook practice pack.
 *
 * Review-source boundary:
 *   1. Build every expectation from a sanitized view containing only id, grade,
 *      type, prompt.en, English options, and student-visible diagram data.
 *   2. Only after all expectations have been built, read stored answers and
 *      compare them with the independent results.
 *
 * The adjacent review JSON is a human review ledger. Every manual expectation
 * has a reason and a SHA-256 binding to its reviewed prompt/options/diagram.
 * Missing, drifted, ambiguous, or figure-incomplete entries intentionally fail
 * the gate instead of borrowing an answer from explanation, independentAnswer,
 * independentSolution, or other fields.
 */

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(SCRIPT_DIR, "..");
const PACK_PATH = resolve(
  ROOT_DIR,
  "data/generated-content/ccss-textbook-practice-v1/question-pack.json",
);
const REVIEW_PATH = resolve(
  SCRIPT_DIR,
  "audit-us-ca-ccss-textbook-k5-independent.review.json",
);

const TARGET_GRADES = ["K", "P1", "P2", "P3", "P4", "P5"];
const TARGET_GRADE_SET = new Set(TARGET_GRADES);
const EXPECTED_GRADE_COUNTS = new Map([
  ["K", 30],
  ["P1", 45],
  ["P2", 63],
  ["P3", 60],
  ["P4", 78],
  ["P5", 60],
]);
const EXPECTED_TOTAL = 336;
const ID_PATTERN = /^ccss-textbook-practice-v1-(.+)-q(\d{2})$/;

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function englishText(value) {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (value && typeof value === "object" && value.en != null) {
    return String(value.en);
  }
  return "";
}

function sha256(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function canonicalText(value) {
  return englishText(value)
    .normalize("NFKC")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[−–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("en-US");
}

function numericValue(value) {
  const raw = englishText(value).trim().toLocaleLowerCase("en-US");
  const vulgar = raw.match(/^([+-]?\d+)?\s*([¼½¾])(?:\s+[a-z]+)?$/);
  if (vulgar) {
    const whole = vulgar[1] == null || vulgar[1] === "" ? 0 : Number(vulgar[1]);
    const part = { "¼": 0.25, "½": 0.5, "¾": 0.75 }[vulgar[2]];
    return whole < 0 ? whole - part : whole + part;
  }

  const normalized = canonicalText(value)
    .replace(/,/g, "")
    .replace(/⁄/g, "/")
    .replace(/°$/, "")
    .replace(/\s*(?:cups?|inches?)$/, "")
    .trim();

  const mixed = normalized.match(/^([+-]?\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const whole = Number(mixed[1]);
    const numerator = Number(mixed[2]);
    const denominator = Number(mixed[3]);
    if (denominator === 0) return null;
    const sign = whole < 0 ? -1 : 1;
    return whole + sign * (numerator / denominator);
  }

  const fraction = normalized.match(/^([+-]?\d+)\/(\d+)$/);
  if (fraction) {
    const numerator = Number(fraction[1]);
    const denominator = Number(fraction[2]);
    return denominator === 0 ? null : numerator / denominator;
  }

  if (/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(normalized)) {
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function valuesAgree(expected, actual, type) {
  if (canonicalText(expected) === canonicalText(actual)) return true;
  if (type === "multiple-choice") return false;

  const expectedNumber = numericValue(expected);
  const actualNumber = numericValue(actual);
  return (
    expectedNumber != null &&
    actualNumber != null &&
    Math.abs(expectedNumber - actualNumber) < 1e-12
  );
}

function sanitizeDiagram(diagram) {
  if (!diagram || typeof diagram !== "object") return null;
  return Object.freeze({
    kind: englishText(diagram.kind),
    display: englishText(diagram.display),
    titleEn: englishText(diagram.title),
    unitEn: englishText(diagram.unit),
    scale: Number.isFinite(Number(diagram.scale)) ? Number(diagram.scale) : null,
    categories: Object.freeze(
      Array.isArray(diagram.categories)
        ? diagram.categories.map((category) =>
            Object.freeze({
              labelEn: englishText(category?.label),
              value: Number(category?.value),
            }),
          )
        : [],
    ),
    values: Object.freeze(
      Array.isArray(diagram.values) ? diagram.values.map(Number) : [],
    ),
    range: Object.freeze(
      Array.isArray(diagram.range) ? diagram.range.map(Number) : [],
    ),
    tickInterval: Number.isFinite(Number(diagram.tickInterval))
      ? Number(diagram.tickInterval)
      : null,
  });
}

function sanitizeQuestion(question) {
  const promptEn = englishText(question.prompt?.en);
  const optionsEn = Object.freeze((question.options ?? []).map(englishText));
  const visibleDiagram = question.diagram ?? null;
  return Object.freeze({
    id: englishText(question.id),
    grade: englishText(question.grade),
    type: englishText(question.type),
    promptEn,
    optionsEn,
    diagram: sanitizeDiagram(visibleDiagram),
    visibleInputSha256: sha256({ promptEn, optionsEn, diagram: visibleDiagram }),
  });
}

function parseQuestionId(id) {
  const match = id.match(ID_PATTERN);
  if (!match) return null;
  return {
    lesson: match[1],
    questionNumber: Number(match[2]),
  };
}

function validateReviewLedger(reviewLedger) {
  const issues = [];

  if (reviewLedger.schemaVersion !== 2) {
    issues.push(`review schemaVersion must be 2, got ${reviewLedger.schemaVersion}`);
  }
  if (reviewLedger.scope?.packageId !== "ccss-textbook-practice-v1") {
    issues.push("review scope packageId does not match ccss-textbook-practice-v1");
  }
  if (reviewLedger.scope?.expectedQuestionCount !== EXPECTED_TOTAL) {
    issues.push(
      `review expectedQuestionCount must be ${EXPECTED_TOTAL}, got ${reviewLedger.scope?.expectedQuestionCount}`,
    );
  }
  if (
    JSON.stringify(reviewLedger.scope?.grades) !== JSON.stringify(TARGET_GRADES)
  ) {
    issues.push("review grade scope must be exactly K, P1, P2, P3, P4, P5");
  }
  if (!reviewLedger.lessons || typeof reviewLedger.lessons !== "object") {
    issues.push("review lessons map is missing");
  }
  const digests = reviewLedger.visibleInputSha256ById;
  if (!digests || typeof digests !== "object" || Array.isArray(digests)) {
    issues.push("review visibleInputSha256ById map is missing");
  } else {
    const digestEntries = Object.entries(digests);
    if (digestEntries.length !== EXPECTED_TOTAL) {
      issues.push(
        `review visible-input digest coverage must be ${EXPECTED_TOTAL}, got ${digestEntries.length}`,
      );
    }
    for (const [id, digest] of digestEntries) {
      if (!/^[a-f0-9]{64}$/.test(digest ?? "")) {
        issues.push(`review visible-input digest is invalid for ${id}`);
      }
    }
  }

  return issues;
}

function optionForNumber(options, target) {
  const matches = options.filter((option) => {
    const parsed = numericValue(option);
    return parsed != null && Math.abs(parsed - target) < 1e-12;
  });
  return matches.length === 1 ? matches[0] : null;
}

function categoryValue(diagram, label) {
  const category = diagram?.categories.find(
    (candidate) => canonicalText(candidate.labelEn) === canonicalText(label),
  );
  return category && Number.isFinite(category.value) ? category.value : null;
}

function deriveFromStudentVisibleDiagram(input) {
  const diagram = input.diagram;
  const values = diagram?.values ?? [];
  const categoryValues = diagram?.categories.map((category) => category.value) ?? [];

  switch (input.id) {
    case "ccss-textbook-practice-v1-picture-graph-q01": {
      if (diagram?.display !== "picture-graph" || !categoryValues.every(Number.isFinite)) {
        return { error: "Picture-graph category values are unavailable or invalid." };
      }
      return {
        expected: String(categoryValues.reduce((sum, value) => sum + value, 0)),
        reason: "Sum all student-visible picture-graph category values.",
      };
    }
    case "ccss-textbook-practice-v1-picture-graph-q02": {
      const dogs = categoryValue(diagram, "Dogs");
      const cats = categoryValue(diagram, "Cats");
      if (diagram?.display !== "picture-graph" || dogs == null || cats == null) {
        return { error: "Picture-graph dog or cat value is unavailable." };
      }
      return {
        expected: String(dogs - cats),
        reason: "Subtract the student-visible cat value from the dog value.",
      };
    }
    case "ccss-textbook-practice-v1-bar-graph-q01": {
      const bananas = categoryValue(diagram, "Bananas");
      const apples = categoryValue(diagram, "Apples");
      if (diagram?.display !== "bar-graph" || bananas == null || apples == null) {
        return { error: "Bar-graph banana or apple value is unavailable." };
      }
      return {
        expected: String(bananas - apples),
        reason: "Subtract the student-visible apple bar value from the banana bar value.",
      };
    }
    case "ccss-textbook-practice-v1-bar-graph-q02": {
      if (diagram?.display !== "bar-graph" || !categoryValues.every(Number.isFinite)) {
        return { error: "Bar-graph category values are unavailable or invalid." };
      }
      return {
        expected: String(categoryValues.reduce((sum, value) => sum + value, 0)),
        reason: "Sum all student-visible bar-graph category values.",
      };
    }
    case "ccss-textbook-practice-v1-measure-line-plot-q01": {
      if (diagram?.display !== "line-plot" || !values.length || !values.every(Number.isFinite)) {
        return { error: "Measurement line-plot values are unavailable or invalid." };
      }
      const frequency = new Map();
      for (const value of values) frequency.set(value, (frequency.get(value) ?? 0) + 1);
      const twice = [...frequency.entries()].filter(([, count]) => count === 2);
      if (twice.length !== 1) {
        return { error: `Expected one length with frequency two, found ${twice.length}.` };
      }
      const option = optionForNumber(input.optionsEn, twice[0][0]);
      if (option == null) {
        return { error: "The uniquely repeated length does not map to one supplied option." };
      }
      return {
        expected: option,
        reason: "Count frequencies in the student-visible line-plot values.",
      };
    }
    case "ccss-textbook-practice-v1-measure-line-plot-q02": {
      if (diagram?.display !== "line-plot" || !values.length || !values.every(Number.isFinite)) {
        return { error: "Measurement line-plot values are unavailable or invalid." };
      }
      return {
        expected: String(values.filter((value) => value > 1.25).length),
        reason: "Count student-visible line-plot values greater than 1.25.",
      };
    }
    case "ccss-textbook-practice-v1-line-plot-operations-q01": {
      if (diagram?.display !== "line-plot" || !values.length || !values.every(Number.isFinite)) {
        return { error: "Beaker line-plot values are unavailable or invalid." };
      }
      return {
        expected: String(values.reduce((sum, value) => sum + value, 0)),
        reason: "Sum the student-visible beaker amounts.",
      };
    }
    case "ccss-textbook-practice-v1-line-plot-operations-q02": {
      if (diagram?.display !== "line-plot" || !values.length || !values.every(Number.isFinite)) {
        return { error: "Beaker line-plot values are unavailable or invalid." };
      }
      const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
      const option = optionForNumber(input.optionsEn, mean);
      if (option == null) {
        return { error: "The equal-share amount does not map to one supplied option." };
      }
      return {
        expected: option,
        reason: "Divide the student-visible total by the represented beaker count.",
      };
    }
    case "ccss-textbook-practice-v1-line-plot-operations-q03": {
      if (diagram?.display !== "line-plot" || !values.length || !values.every(Number.isFinite)) {
        return { error: "Beaker line-plot values are unavailable or invalid." };
      }
      return {
        expected: String(
          values.reduce((sum, value) => sum + value, 0) / values.length,
        ),
        reason: "Divide the student-visible total by the represented beaker count.",
      };
    }
    default:
      return null;
  }
}

function buildIndependentReviews(reviewInputs, reviewLedger) {
  const derived = new Map();
  const unreviewed = [];
  const ambiguous = [];
  const optionIssues = [];
  const sourceLessons = new Set();
  const sourceIds = new Set();

  for (const input of reviewInputs) {
    sourceIds.add(input.id);
    const parsedId = parseQuestionId(input.id);
    if (!parsedId || parsedId.questionNumber < 1 || parsedId.questionNumber > 3) {
      unreviewed.push({ id: input.id, reason: "ID does not identify q01, q02, or q03." });
      continue;
    }

    sourceLessons.add(parsedId.lesson);
    const lessonEntries = reviewLedger.lessons?.[parsedId.lesson];
    const entry = Array.isArray(lessonEntries)
      ? lessonEntries[parsedId.questionNumber - 1]
      : undefined;

    if (!entry || typeof entry !== "object") {
      unreviewed.push({ id: input.id, reason: "No independent review entry." });
      continue;
    }
    const reviewedDigest = reviewLedger.visibleInputSha256ById?.[input.id];
    if (!/^[a-f0-9]{64}$/.test(reviewedDigest ?? "")) {
      unreviewed.push({ id: input.id, reason: "No valid visible-input review digest." });
      continue;
    }
    if (reviewedDigest !== input.visibleInputSha256) {
      unreviewed.push({
        id: input.id,
        reason: "Prompt/options/diagram changed after independent review.",
      });
      continue;
    }
    if (typeof entry.reason !== "string" || entry.reason.trim().length < 8) {
      unreviewed.push({ id: input.id, reason: "Review entry lacks a substantive reason." });
      continue;
    }

    if (entry.status === "ambiguous") {
      if (Object.hasOwn(entry, "expected")) {
        unreviewed.push({
          id: input.id,
          reason: "Ambiguous review entry must not declare an expected answer.",
        });
        continue;
      }
      const result = Object.freeze({
        id: input.id,
        status: "ambiguous",
        rule: "manual-prompt-options-review",
        reason: entry.reason,
      });
      derived.set(input.id, result);
      ambiguous.push(result);
      continue;
    }

    if (entry.status != null && entry.status !== "resolved") {
      unreviewed.push({ id: input.id, reason: `Unknown review status: ${entry.status}` });
      continue;
    }
    if (!Object.hasOwn(entry, "expected") || englishText(entry.expected).trim() === "") {
      unreviewed.push({ id: input.id, reason: "Resolved review entry has no expectation." });
      continue;
    }

    const diagramResult = deriveFromStudentVisibleDiagram(input);
    if (diagramResult?.error) {
      unreviewed.push({ id: input.id, reason: diagramResult.error });
      continue;
    }
    if (
      diagramResult &&
      !valuesAgree(entry.expected, diagramResult.expected, input.type)
    ) {
      unreviewed.push({
        id: input.id,
        reason: `Review expectation ${JSON.stringify(entry.expected)} conflicts with diagram-derived ${JSON.stringify(diagramResult.expected)}.`,
      });
      continue;
    }

    const result = Object.freeze({
      id: input.id,
      status: "resolved",
      expected: diagramResult?.expected ?? englishText(entry.expected),
      rule: diagramResult
        ? "student-visible-diagram-rule"
        : "manual-prompt-options-review",
      reason: diagramResult?.reason ?? entry.reason,
      grade: input.grade,
      type: input.type,
    });

    if (input.type === "multiple-choice") {
      const expectedCanonical = canonicalText(result.expected);
      const matchingOptions = input.optionsEn.filter(
        (option) => canonicalText(option) === expectedCanonical,
      );
      if (matchingOptions.length !== 1) {
        optionIssues.push({
          id: input.id,
          expected: result.expected,
          matches: matchingOptions.length,
          reason:
            matchingOptions.length === 0
              ? "Independent expectation is not one of the supplied English options."
              : "Independent expectation matches more than one supplied English option.",
        });
      }
    }

    derived.set(input.id, result);
  }

  const ledgerLessons = Object.keys(reviewLedger.lessons ?? {});
  for (const lesson of ledgerLessons) {
    const entries = reviewLedger.lessons[lesson];
    if (!sourceLessons.has(lesson)) {
      unreviewed.push({ id: `review:${lesson}`, reason: "Stale review lesson is not in K-P5 source." });
    }
    if (!Array.isArray(entries) || entries.length !== 3) {
      unreviewed.push({ id: `review:${lesson}`, reason: "Each lesson must review exactly three items." });
    }
  }
  for (const id of Object.keys(reviewLedger.visibleInputSha256ById ?? {})) {
    if (!sourceIds.has(id)) {
      unreviewed.push({ id: `review:${id}`, reason: "Stale visible-input digest has no K-P5 source item." });
    }
  }

  return { derived, unreviewed, ambiguous, optionIssues };
}

function assertSelfTest(condition, message) {
  if (!condition) throw new Error(`SELF_TEST_FAILED: ${message}`);
}

function runSelfTests() {
  const id = "ccss-textbook-practice-v1-counting-ten-frame-q01";
  const baseQuestion = {
    id,
    grade: "K",
    type: "multiple-choice",
    prompt: { en: "A full ten-frame is completely filled. How many counters is that?" },
    options: [{ en: "5" }, { en: "10" }, { en: "20" }, { en: "11" }],
    diagram: null,
  };
  const baseInput = sanitizeQuestion(baseQuestion);
  const reviewLedger = {
    visibleInputSha256ById: { [id]: baseInput.visibleInputSha256 },
    lessons: {
      "counting-ten-frame": [
        { expected: "10", reason: "A full ten-frame has ten cells." },
        { expected: "3", reason: "Unused self-test row." },
        { expected: "5", reason: "Unused self-test row." },
      ],
    },
  };

  const baseline = buildIndependentReviews([baseInput], reviewLedger);
  assertSelfTest(baseline.derived.size === 1, "reviewed baseline must resolve");
  assertSelfTest(baseline.unreviewed.length === 0, "reviewed baseline must have no drift");

  for (const [label, mutation] of [
    ["prompt", { prompt: { en: "A full five-frame is filled. How many counters is that?" } }],
    ["options", { options: [{ en: "5" }, { en: "9" }, { en: "20" }, { en: "11" }] }],
    ["diagram", { diagram: { kind: "ten-frame", groups: [{ count: 5 }] } }],
  ]) {
    const changed = sanitizeQuestion({ ...baseQuestion, ...mutation });
    const result = buildIndependentReviews([changed], reviewLedger);
    assertSelfTest(result.derived.size === 0, `${label} drift must not resolve`);
    assertSelfTest(
      result.unreviewed.some((item) => item.reason.includes("changed after independent review")),
      `${label} drift must report a digest mismatch`,
    );
  }

  console.log("PASS: CCSS K-P5 independent mutation self-tests rejected visible-input drift.");
}

function printItems(label, items, formatter) {
  if (items.length === 0) return;
  console.log(`\n${label} (${items.length})`);
  for (const item of items) console.log(`- ${formatter(item)}`);
}

if (process.argv.includes("--self-test")) {
  runSelfTests();
  process.exit(0);
}

const pack = readJson(PACK_PATH);
const reviewLedger = readJson(REVIEW_PATH);
const schemaIssues = validateReviewLedger(reviewLedger);
const allQuestions = Array.isArray(pack.questions) ? pack.questions : [];
const scopedQuestions = allQuestions.filter((question) =>
  TARGET_GRADE_SET.has(englishText(question.grade)),
);

const inventoryIssues = [];
if (pack.packageId !== "ccss-textbook-practice-v1") {
  inventoryIssues.push(`pack packageId is ${pack.packageId ?? "missing"}`);
}
if (scopedQuestions.length !== EXPECTED_TOTAL) {
  inventoryIssues.push(
    `K-P5 inventory must contain ${EXPECTED_TOTAL} questions, found ${scopedQuestions.length}`,
  );
}

const sourceIds = new Set();
for (const question of scopedQuestions) {
  const id = englishText(question.id);
  if (sourceIds.has(id)) inventoryIssues.push(`duplicate question id: ${id}`);
  sourceIds.add(id);
}

const actualGradeCounts = new Map(
  TARGET_GRADES.map((grade) => [
    grade,
    scopedQuestions.filter((question) => englishText(question.grade) === grade).length,
  ]),
);
for (const grade of TARGET_GRADES) {
  const actual = actualGradeCounts.get(grade);
  const expected = EXPECTED_GRADE_COUNTS.get(grade);
  if (actual !== expected) {
    inventoryIssues.push(`${grade} inventory must be ${expected}, found ${actual}`);
  }
}

// Stage 1: independent derivation gets only the explicitly sanitized fields.
const reviewInputs = scopedQuestions.map(sanitizeQuestion);
const { derived, unreviewed, ambiguous, optionIssues } = buildIndependentReviews(
  reviewInputs,
  reviewLedger,
);

// Stage 2: stored answers are read only after the complete expectation map exists.
const storedAnswers = new Map(
  scopedQuestions.map((question) => [englishText(question.id), question.answer]),
);
const mismatches = [];
for (const [id, result] of derived) {
  if (result.status !== "resolved") continue;
  const stored = storedAnswers.get(id);
  if (!valuesAgree(result.expected, stored, result.type)) {
    mismatches.push({
      id,
      expected: result.expected,
      stored: englishText(stored) || "<missing>",
      reason: result.reason,
    });
  }
}

const reviewedCount = derived.size;
const resolvedCount = [...derived.values()].filter(
  (result) => result.status === "resolved",
).length;

console.log("US California CCSS textbook K-P5 independent answer audit");
console.log(`pack: ${PACK_PATH}`);
console.log(`review ledger: ${REVIEW_PATH}`);
console.log(
  `grade inventory: ${TARGET_GRADES.map(
    (grade) => `${grade}=${actualGradeCounts.get(grade)}`,
  ).join(", ")}`,
);
console.log(`reviewed: ${reviewedCount}/${EXPECTED_TOTAL}`);
console.log(`resolved expectations: ${resolvedCount}`);
console.log(`unreviewed: ${unreviewed.length}`);
console.log(`ambiguous: ${ambiguous.length}`);
console.log(`mismatches: ${mismatches.length}`);
console.log(`multiple-choice option issues: ${optionIssues.length}`);

printItems("Schema issues", schemaIssues, (issue) => issue);
printItems("Inventory issues", inventoryIssues, (issue) => issue);
printItems("Unreviewed entries", unreviewed, (item) => `${item.id}: ${item.reason}`);
printItems(
  "Ambiguous prompt/options",
  ambiguous,
  (item) => `${item.id}: ${item.reason}`,
);
printItems(
  "Multiple-choice expectation issues",
  optionIssues,
  (item) => `${item.id}: expected ${JSON.stringify(item.expected)}; ${item.reason}`,
);
printItems(
  "Stored-answer mismatches",
  mismatches,
  (item) =>
    `${item.id}: expected ${JSON.stringify(item.expected)}, stored ${JSON.stringify(item.stored)}; ${item.reason}`,
);

const blockers =
  schemaIssues.length +
  inventoryIssues.length +
  unreviewed.length +
  ambiguous.length +
  optionIssues.length +
  mismatches.length;

if (blockers > 0) {
  console.error(`\nFAIL: ${blockers} blocking issue(s).`);
  process.exitCode = 1;
} else {
  console.log("\nPASS: all 336 items have unique independent expectations matching stored answers.");
}
