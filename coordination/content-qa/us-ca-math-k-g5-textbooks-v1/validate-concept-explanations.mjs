import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const packageDir = path.join(repoRoot, "coordination/content-qa/us-ca-math-k-g5-textbooks-v1");

const lessonPackPaths = [
  path.join(repoRoot, "data/generated-content/us-ca-math-k-g5-textbooks-v1/lessons.json"),
  path.join(repoRoot, "coordination/content-qa/us-ca-math-k-g5-textbooks-v1/lessons.json")
];

const expectedGradeCounts = {
  K: 6,
  P1: 4,
  P2: 4,
  P3: 5,
  P4: 5,
  P5: 5
};

const blockedGuidelinePatterns = [
  /Start with a quick notice-and-wonder/i,
  /Students describe the quantities/i,
  /before calculating/i,
  /In this MAIS lesson, students move/i,
  /concrete examples to a symbolic or written explanation/i,
  /this kind of concept explanation/i
];

const blockedSourcePatterns = [
  /\bIXL\b/i,
  /\bDeepSeek\b/i,
  /standard identifiers/i,
  /alignment metadata/i,
  /copied official/i,
  /raw corpus/i
];

const blockedAgeFitPatternsByGrade = {
  K: [/\balgorithm/i, /\bsymbolic/i, /\bstandard\b/i, /\bmetadata\b/i],
  P1: [/\balgorithm/i, /\bsymbolic/i, /\bmetadata\b/i],
  P2: [/\bsymbolic/i, /\bmetadata\b/i]
};

const requiredKeywordsByLessonId = {
  "us-ca-k-g5-tx-v1-k-k-cc-count-sequence": ["count", "number", "object"],
  "us-ca-k-g5-tx-v1-k-k-cc-cardinality-compare": ["compare", "group", "more"],
  "us-ca-k-g5-tx-v1-k-k-oa-compose-decompose": ["parts", "whole", "within 10"],
  "us-ca-k-g5-tx-v1-k-k-nbt-teen-numbers": ["ten", "ones", "teen"],
  "us-ca-k-g5-tx-v1-k-k-md-attributes-data": ["attribute", "measuring", "compare"],
  "us-ca-k-g5-tx-v1-k-k-g-shapes-position": ["shape", "attributes", "position"],
  "us-ca-k-g5-tx-v1-p1-1-oa-add-subtract": ["addition", "subtraction", "equals"],
  "us-ca-k-g5-tx-v1-p1-1-nbt-place-value": ["place value", "tens", "ones"],
  "us-ca-k-g5-tx-v1-p1-1-md-measure-data": ["measure", "unit", "length"],
  "us-ca-k-g5-tx-v1-p1-1-g-shape-reasoning": ["attributes", "equal shares", "halves"],
  "us-ca-k-g5-tx-v1-p2-2-oa-fluency-arrays": ["addition", "arrays", "fluency"],
  "us-ca-k-g5-tx-v1-p2-2-nbt-three-digit-place-value": ["hundreds", "tens", "ones"],
  "us-ca-k-g5-tx-v1-p2-2-md-measure-data-money-time": ["unit", "money", "time"],
  "us-ca-k-g5-tx-v1-p2-2-g-partition-shapes": ["partitioning", "equal", "rows"],
  "us-ca-k-g5-tx-v1-p3-3-oa-mult-div": ["multiplication", "division", "equal groups"],
  "us-ca-k-g5-tx-v1-p3-3-nbt-arithmetic": ["rounding", "place value", "estimate"],
  "us-ca-k-g5-tx-v1-p3-3-nf-fraction-meaning": ["fraction", "denominator", "number line"],
  "us-ca-k-g5-tx-v1-p3-3-md-time-data-area-perimeter": ["area", "perimeter", "elapsed time"],
  "us-ca-k-g5-tx-v1-p3-3-g-categories": ["polygons", "quadrilateral", "equal"],
  "us-ca-k-g5-tx-v1-p4-4-oa-factors-patterns": ["multiplicative", "factors", "multiples"],
  "us-ca-k-g5-tx-v1-p4-4-nbt-multi-digit": ["place value", "multi-digit", "divide"],
  "us-ca-k-g5-tx-v1-p4-4-nf-fraction-decimal": ["equivalent fractions", "decimals", "same quantity"],
  "us-ca-k-g5-tx-v1-p4-4-md-conversion-angles": ["conversion", "angle", "units"],
  "us-ca-k-g5-tx-v1-p4-4-g-lines-shapes": ["parallel", "perpendicular", "symmetry"],
  "us-ca-k-g5-tx-v1-p5-5-oa-expressions-patterns": ["expression", "order of operations", "patterns"],
  "us-ca-k-g5-tx-v1-p5-5-nbt-decimals": ["decimals", "place value", "decimal point"],
  "us-ca-k-g5-tx-v1-p5-5-nf-operations": ["unlike fractions", "multiplying", "dividing"],
  "us-ca-k-g5-tx-v1-p5-5-md-volume-data": ["volume", "cubic units", "unit conversions"],
  "us-ca-k-g5-tx-v1-p5-5-g-coordinate-shapes": ["ordered pair", "x-axis", "hierarchy"]
};

function words(value) {
  return value.match(/[A-Za-z0-9()]+(?:[-'][A-Za-z0-9()]+)*/g) ?? [];
}

function sentenceCount(value) {
  return value
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean).length;
}

function matchesAny(patterns, value) {
  return patterns.filter((pattern) => pattern.test(value)).map((pattern) => pattern.toString());
}

function normalize(value) {
  return value.toLowerCase();
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function validatePack(filePath) {
  const pack = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const rows = [];
  const gradeCounts = {};
  const conceptTexts = new Set();

  for (const lesson of pack.lessons) {
    const launch = lesson.studentLesson?.en?.launch ?? "";
    const concept = lesson.studentLesson?.en?.conceptExplanation ?? "";
    const combined = `${launch}\n\n${concept}`;
    const lower = normalize(combined);
    const grade = lesson.metadata?.grade ?? "missing";
    gradeCounts[grade] = (gradeCounts[grade] ?? 0) + 1;

    const blockedGuidelineHits = matchesAny(blockedGuidelinePatterns, combined);
    const blockedSourceHits = matchesAny(blockedSourcePatterns, combined);
    const ageFitHits = matchesAny(blockedAgeFitPatternsByGrade[grade] ?? [], combined);
    const requiredKeywords = requiredKeywordsByLessonId[lesson.id] ?? [];
    const missingKeywords = requiredKeywords.filter((keyword) => !lower.includes(keyword.toLowerCase()));
    const wordCount = words(combined).length;
    const sentences = sentenceCount(combined);
    const duplicateConcept = conceptTexts.has(combined);
    conceptTexts.add(combined);

    const issues = [
      ...(blockedGuidelineHits.length ? [`guideline phrases: ${blockedGuidelineHits.join("; ")}`] : []),
      ...(blockedSourceHits.length ? [`source/internal phrases: ${blockedSourceHits.join("; ")}`] : []),
      ...(ageFitHits.length ? [`age-fit flags: ${ageFitHits.join("; ")}`] : []),
      ...(missingKeywords.length ? [`missing unit keywords: ${missingKeywords.join("; ")}`] : []),
      ...(wordCount < 40 || wordCount > 105 ? [`word count outside 40-105: ${wordCount}`] : []),
      ...(sentences < 4 ? [`sentence count below 4: ${sentences}`] : []),
      ...(duplicateConcept ? ["duplicate combined concept text"] : [])
    ];

    rows.push({
      lessonId: lesson.id,
      grade,
      domainId: lesson.metadata?.domainId ?? "",
      clusterId: lesson.metadata?.clusterId ?? "",
      wordCount,
      sentenceCount: sentences,
      keywordStatus: missingKeywords.length ? "needs-repair" : "pass",
      ageFitStatus: ageFitHits.length ? "needs-repair" : "pass",
      sourcePolicyStatus: blockedSourceHits.length ? "needs-repair" : "pass",
      guidelineStatus: blockedGuidelineHits.length ? "needs-repair" : "pass",
      qaStatus: issues.length ? "needs-repair" : "pass",
      reviewerNotes: issues.length
        ? issues.join(" | ")
        : "Pass: student-facing, grade-aware, unit-specific concept explanation with no blocked guideline/source phrases."
    });
  }

  const missingGradeCounts = Object.entries(expectedGradeCounts).filter(([grade, count]) => gradeCounts[grade] !== count);
  return {
    filePath,
    packageId: pack.packageId,
    lessonCount: pack.lessons.length,
    gradeCounts,
    missingGradeCounts,
    rows,
    status: pack.lessons.length === 29 && !missingGradeCounts.length && rows.every((row) => row.qaStatus === "pass")
      ? "pass"
      : "needs-repair"
  };
}

const results = lessonPackPaths.map(validatePack);
const primary = results[0];
const allRows = primary.rows;
const summary = {
  packageId: primary.packageId,
  qaRunAt: "2026-06-27",
  qaOwner: "A18",
  integrationOwner: "A05",
  checkName: "California K-G5 concept explanation row-level QA",
  status: results.every((result) => result.status === "pass") ? "pass" : "needs-repair",
  lessonCount: primary.lessonCount,
  gradeCounts: primary.gradeCounts,
  checkedFiles: results.map((result) => path.relative(repoRoot, result.filePath)),
  passRows: allRows.filter((row) => row.qaStatus === "pass").length,
  needsRepairRows: allRows.filter((row) => row.qaStatus !== "pass").length,
  blockedGuidelinePatterns: blockedGuidelinePatterns.map(String),
  blockedSourcePatterns: blockedSourcePatterns.map(String)
};

const csvHeader = [
  "lessonId",
  "grade",
  "domainId",
  "clusterId",
  "wordCount",
  "sentenceCount",
  "keywordStatus",
  "ageFitStatus",
  "sourcePolicyStatus",
  "guidelineStatus",
  "qaStatus",
  "reviewerNotes"
];
const csv = [
  csvHeader.join(","),
  ...allRows.map((row) => csvHeader.map((field) => csvEscape(row[field])).join(","))
].join("\n");

fs.writeFileSync(path.join(packageDir, "concept-explanation-qa-results.csv"), `${csv}\n`);
fs.writeFileSync(path.join(packageDir, "concept-explanation-qa-report.json"), `${JSON.stringify({ ...summary, rows: allRows }, null, 2)}\n`);

console.log(JSON.stringify(summary, null, 2));
if (summary.status !== "pass") {
  process.exitCode = 1;
}
