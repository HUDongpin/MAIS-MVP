#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Independent explanation-quality gate for the 336 K-P5 CCSS textbook items.
 *
 * The ordering is deliberate:
 * 1. Build an independent expected answer and key reasoning from a sanitized
 *    view of prompt.en, English options, and the student-visible diagram.
 * 2. Only after all 336 independent reviews exist, read explanation.en and
 *    compare it with the human-reviewed explanation ledger.
 *
 * The pack's answer and independent* fields are never read by this audit.
 * Explanation changes fail as unreviewed drift until a human checks equations,
 * contradictions, and answer support and updates the adjacent review ledger.
 */

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = resolve(SCRIPT_DIR, "..");
const PACK_PATH = resolve(
  ROOT_DIR,
  "data/generated-content/ccss-textbook-practice-v1/question-pack.json",
);
const REVIEW_PATH = resolve(
  SCRIPT_DIR,
  "audit-us-ca-ccss-textbook-k5-explanations.review.json",
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
const EXPECTED_DIAGRAM_ITEMS = 9;

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

function visibleInput(question) {
  return Object.freeze({
    promptEn: englishText(question.prompt),
    optionsEn: Object.freeze((question.options ?? []).map(englishText)),
    diagram: question.diagram ?? null,
  });
}

function reviewInput(question) {
  return Object.freeze({
    id: englishText(question.id),
    grade: englishText(question.grade),
    type: englishText(question.type),
    visible: visibleInput(question),
  });
}

function printItems(label, items, formatter) {
  if (items.length === 0) return;
  console.log(`\n${label} (${items.length})`);
  for (const item of items) console.log(`- ${formatter(item)}`);
}

function parseFraction(numeratorRaw, denominatorRaw) {
  const numerator = Number(numeratorRaw);
  const denominator = Number(denominatorRaw);
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator) || denominator === 0) {
    return null;
  }
  return { numerator, denominator, value: numerator / denominator };
}

function sameFraction(left, right) {
  return left.numerator * right.denominator === right.numerator * left.denominator;
}

function explicitComparisonDefect(explanation, expected) {
  const normalized = String(explanation).normalize("NFKC").toLowerCase();
  const fractionRelation =
    /(\d+)\s*\/\s*(\d+)\s+is\s+(greater|larger|less|smaller)\s+than\s+(\d+)\s*\/\s*(\d+)/gi;
  for (const match of normalized.matchAll(fractionRelation)) {
    const left = parseFraction(match[1], match[2]);
    const right = parseFraction(match[4], match[5]);
    if (!left || !right) return `unreadable fraction comparison: ${match[0]}`;
    const relation = match[3].toLowerCase();
    const valid = ["greater", "larger"].includes(relation)
      ? left.value > right.value
      : left.value < right.value;
    if (!valid) return `false explicit fraction comparison: ${match[0]}`;
  }

  const numericRelation =
    /(?<![\d./])(-?\d+(?:\.\d+)?)(?!\d|\/|\.\d)(?:\s+[a-z-]+)?\s+is\s+(greater|more|longer|less|shorter)\s+than\s+(-?\d+(?:\.\d+)?)(?!\d|\/|\.\d)/gi;
  for (const match of normalized.matchAll(numericRelation)) {
    const left = Number(match[1]);
    const right = Number(match[3]);
    const relation = match[2].toLowerCase();
    const valid = ["greater", "more", "longer"].includes(relation)
      ? left > right
      : left < right;
    if (!valid) return `false explicit numeric comparison: ${match[0]}`;
  }

  const expectedMatch = /^(\d+)\s*\/\s*(\d+)$/.exec(String(expected).trim());
  if (!expectedMatch) return null;
  const expectedFraction = parseFraction(expectedMatch[1], expectedMatch[2]);
  if (!expectedFraction) return `independent expected fraction is invalid: ${expected}`;

  const winnerClaims = [
    /\b(\d+)\s*\/\s*(\d+)\s+is\s+(?:the\s+)?(?:greater|larger)(?:\s+fraction)?\b(?!\s+than)/gi,
    /\b(?:the\s+)?(?:greater|larger)\s+fraction\s+is\s+(\d+)\s*\/\s*(\d+)\b/gi,
  ];
  for (const winnerClaim of winnerClaims) {
    for (const match of normalized.matchAll(winnerClaim)) {
      const claimed = parseFraction(match[1], match[2]);
      if (!claimed || !sameFraction(claimed, expectedFraction)) {
        return `explicit greater-fraction conclusion ${match[1]}/${match[2]} conflicts with independent expectation ${expected}`;
      }
    }
  }

  return null;
}

function assertSelfTest(condition, message) {
  if (!condition) throw new Error(`SELF_TEST_FAILED: ${message}`);
}

function runSelfTests() {
  const generic = "With the same denominator, the fraction with the larger numerator is greater.";
  assertSelfTest(explicitComparisonDefect(generic, "5/7") === null, "generic valid rule");
  assertSelfTest(
    explicitComparisonDefect(`${generic} Therefore 5/7 is the greater fraction.`, "5/7") === null,
    "correct explicit fraction winner"
  );
  assertSelfTest(
    explicitComparisonDefect("4/5 is less than 5/6.", "5/6") === null,
    "true explicit fraction relation"
  );
  assertSelfTest(
    explicitComparisonDefect(`${generic} 4/7 is greater.`, "5/7") !== null,
    "wrong explicit fraction winner must fail"
  );
  assertSelfTest(
    explicitComparisonDefect("4/7 is greater than 5/7.", "5/7") !== null,
    "false explicit fraction relation must fail"
  );
  assertSelfTest(
    explicitComparisonDefect("4 is greater than 9.", "9") !== null,
    "false explicit numeric relation must fail"
  );
  console.log("PASS: CCSS K-P5 explanation mutation self-tests rejected explicit contradictions.");
}

if (process.argv.includes("--self-test")) {
  runSelfTests();
  process.exit(0);
}

const pack = readJson(PACK_PATH);
const ledger = readJson(REVIEW_PATH);
const questions = Array.isArray(pack.questions) ? pack.questions : [];
const scopedQuestions = questions.filter((question) =>
  TARGET_GRADE_SET.has(englishText(question.grade)),
);

const inventoryIssues = [];
if (pack.packageId !== "ccss-textbook-practice-v1") {
  inventoryIssues.push({
    id: "<pack>",
    reason: `packageId is ${JSON.stringify(pack.packageId)}, expected ccss-textbook-practice-v1`,
  });
}
if (ledger.schemaVersion !== 1) {
  inventoryIssues.push({
    id: "<review>",
    reason: `schemaVersion is ${JSON.stringify(ledger.schemaVersion)}, expected 1`,
  });
}
if (ledger.scope?.packageId !== "ccss-textbook-practice-v1") {
  inventoryIssues.push({
    id: "<review>",
    reason: "review packageId does not match ccss-textbook-practice-v1",
  });
}
if (
  JSON.stringify(ledger.scope?.grades) !== JSON.stringify(TARGET_GRADES) ||
  ledger.scope?.expectedQuestionCount !== EXPECTED_TOTAL
) {
  inventoryIssues.push({
    id: "<review>",
    reason: "review scope must be exactly K-P5 with 336 questions",
  });
}
if (scopedQuestions.length !== EXPECTED_TOTAL) {
  inventoryIssues.push({
    id: "<pack>",
    reason: `K-P5 inventory is ${scopedQuestions.length}, expected ${EXPECTED_TOTAL}`,
  });
}

const gradeCounts = new Map(
  TARGET_GRADES.map((grade) => [
    grade,
    scopedQuestions.filter((question) => englishText(question.grade) === grade).length,
  ]),
);
for (const grade of TARGET_GRADES) {
  if (gradeCounts.get(grade) !== EXPECTED_GRADE_COUNTS.get(grade)) {
    inventoryIssues.push({
      id: `<grade:${grade}>`,
      reason: `found ${gradeCounts.get(grade)}, expected ${EXPECTED_GRADE_COUNTS.get(grade)}`,
    });
  }
}

const diagramCount = scopedQuestions.filter((question) => question.diagram != null).length;
if (diagramCount !== EXPECTED_DIAGRAM_ITEMS) {
  inventoryIssues.push({
    id: "<diagram-coverage>",
    reason: `found ${diagramCount} diagram items, expected ${EXPECTED_DIAGRAM_ITEMS}`,
  });
}

const sourceIdCounts = new Map();
for (const question of scopedQuestions) {
  const id = englishText(question.id);
  sourceIdCounts.set(id, (sourceIdCounts.get(id) ?? 0) + 1);
}
for (const [id, count] of sourceIdCounts) {
  if (count > 1) {
    inventoryIssues.push({ id, reason: `question ID appears ${count} times` });
  }
}

const ledgerRecords =
  ledger.records && typeof ledger.records === "object" && !Array.isArray(ledger.records)
    ? ledger.records
    : {};
if (Object.keys(ledgerRecords).length !== EXPECTED_TOTAL) {
  inventoryIssues.push({
    id: "<review>",
    reason: `review contains ${Object.keys(ledgerRecords).length} records, expected ${EXPECTED_TOTAL}`,
  });
}

// Stage 1: derive/bind all expected answers and key reasoning without reading
// any explanation or any answer/independent* field from the question pack.
const independentReviews = new Map();
const unreviewedInputs = [];
const optionIssues = [];
const inputs = scopedQuestions.map(reviewInput);
for (const input of inputs) {
  const record = ledgerRecords[input.id];
  if (!record || typeof record !== "object") {
    unreviewedInputs.push({ id: input.id, reason: "missing independent review record" });
    continue;
  }
  if (record.grade !== input.grade || record.type !== input.type) {
    unreviewedInputs.push({
      id: input.id,
      reason: `review grade/type ${record.grade}/${record.type} does not match ${input.grade}/${input.type}`,
    });
    continue;
  }
  if (typeof record.expected !== "string" || record.expected.trim() === "") {
    unreviewedInputs.push({ id: input.id, reason: "review has no independent expectation" });
    continue;
  }
  if (typeof record.keyReasoning !== "string" || record.keyReasoning.trim().length < 8) {
    unreviewedInputs.push({ id: input.id, reason: "review has no substantive key reasoning" });
    continue;
  }
  const actualInputHash = sha256(input.visible);
  if (record.visibleInputSha256 !== actualInputHash) {
    unreviewedInputs.push({
      id: input.id,
      reason: "prompt/options/diagram changed after independent review",
    });
    continue;
  }

  if (input.type === "multiple-choice") {
    const matches = input.visible.optionsEn.filter(
      (option) => option === record.expected,
    ).length;
    if (matches !== 1) {
      optionIssues.push({
        id: input.id,
        reason:
          matches === 0
            ? `independent expectation ${JSON.stringify(record.expected)} is not an English option`
            : `independent expectation ${JSON.stringify(record.expected)} matches ${matches} English options`,
      });
    }
  }

  independentReviews.set(
    input.id,
    Object.freeze({
      id: input.id,
      expected: record.expected,
      keyReasoning: record.keyReasoning,
      hasDiagram: input.visible.diagram != null,
    }),
  );
}

for (const id of Object.keys(ledgerRecords)) {
  if (!sourceIdCounts.has(id)) {
    unreviewedInputs.push({ id, reason: "stale review record has no K-P5 question" });
  }
}

// Stage 2: explanations are first read here, after all independent expectations
// have been constructed and bound to the visible question input.
const explanationById = new Map(
  scopedQuestions.map((question) => [
    englishText(question.id),
    englishText(question.explanation),
  ]),
);
const approved = [];
const defects = [];
const explanationDrift = [];
for (const [id, independent] of independentReviews) {
  const record = ledgerRecords[id];
  const explanation = explanationById.get(id) ?? "";
  if (explanation.trim() === "") {
    explanationDrift.push({ id, reason: "explanation.en is missing or empty" });
    continue;
  }
  if (!/^[a-f0-9]{64}$/.test(record.reviewedExplanationSha256 ?? "")) {
    explanationDrift.push({ id, reason: "reviewed explanation digest is missing or invalid" });
    continue;
  }
  if (sha256(explanation) !== record.reviewedExplanationSha256) {
    explanationDrift.push({
      id,
      reason: "explanation.en changed after human review; equations and answer support require re-review",
    });
    continue;
  }

  if (record.verdict === "approved") {
    const contradiction = explicitComparisonDefect(explanation, independent.expected);
    if (contradiction) {
      defects.push({
        id,
        expected: independent.expected,
        keyReasoning: independent.keyReasoning,
        explanation,
        reason: contradiction,
      });
      continue;
    }
    approved.push({ id, hasDiagram: independent.hasDiagram });
  } else if (record.verdict === "defect") {
    if (typeof record.defectReason !== "string" || record.defectReason.trim().length < 12) {
      explanationDrift.push({ id, reason: "defect verdict has no substantive reason" });
      continue;
    }
    defects.push({
      id,
      expected: independent.expected,
      keyReasoning: independent.keyReasoning,
      explanation,
      reason: record.defectReason,
    });
  } else {
    explanationDrift.push({
      id,
      reason: `unknown explanation verdict ${JSON.stringify(record.verdict)}`,
    });
  }
}

const reviewedCount = approved.length + defects.length;
const reviewedDiagramCount = [...independentReviews.values()].filter(
  (review) => review.hasDiagram,
).length;

console.log("US California CCSS textbook K-P5 explanation audit");
console.log(`pack: ${PACK_PATH}`);
console.log(`review ledger: ${REVIEW_PATH}`);
console.log(
  `grade inventory: ${TARGET_GRADES.map((grade) => `${grade}=${gradeCounts.get(grade)}`).join(", ")}`,
);
console.log(`independent answer/reason coverage: ${independentReviews.size}/${EXPECTED_TOTAL}`);
console.log(`explanations reviewed: ${reviewedCount}/${EXPECTED_TOTAL}`);
console.log(`diagram explanations covered: ${reviewedDiagramCount}/${EXPECTED_DIAGRAM_ITEMS}`);
console.log(`approved explanations: ${approved.length}`);
console.log(`unreviewed visible inputs: ${unreviewedInputs.length}`);
console.log(`unreviewed explanation drift: ${explanationDrift.length}`);
console.log(`multiple-choice option issues: ${optionIssues.length}`);
console.log(`explanation defects: ${defects.length}`);

printItems(
  "Inventory issues",
  inventoryIssues,
  (item) => `${item.id}: ${item.reason}`,
);
printItems(
  "Unreviewed prompt/options/diagram inputs",
  unreviewedInputs,
  (item) => `${item.id}: ${item.reason}`,
);
printItems(
  "Multiple-choice expectation issues",
  optionIssues,
  (item) => `${item.id}: ${item.reason}`,
);
printItems(
  "Unreviewed explanation drift",
  explanationDrift,
  (item) => `${item.id}: ${item.reason}`,
);
printItems(
  "Explanation defects",
  defects,
  (item) =>
    `${item.id}: ${item.reason} Independent expectation=${JSON.stringify(item.expected)}; explanation=${JSON.stringify(item.explanation)}`,
);

const blockerCount =
  inventoryIssues.length +
  unreviewedInputs.length +
  optionIssues.length +
  explanationDrift.length +
  defects.length;

if (blockerCount > 0) {
  console.error(`\nFAIL: ${blockerCount} blocking explanation issue(s).`);
  process.exitCode = 1;
} else {
  console.log(
    "\nPASS: all 336 explanations contain reviewed, contradiction-free support for independently derived answers.",
  );
}
