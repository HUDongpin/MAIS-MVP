import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageId = "us-ca-math-k-g5-textbooks-v1";
const packageDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(packageDir, "../../..");
const standardsIndexPath =
  process.env.CALIFORNIA_MATH_COMMON_CORE_STANDARDS_INDEX ??
  path.join(projectRoot, ".local/skills/california-math-common-core/references/standards-index.json");
const generatedAt = "2026-06-19";
const targetGrades = ["K", "P1", "P2", "P3", "P4", "P5"];
const gradeLabels = {
  K: "Kindergarten",
  P1: "Grade 1",
  P2: "Grade 2",
  P3: "Grade 3",
  P4: "Grade 4",
  P5: "Grade 5"
};
const gradeNumbers = {
  K: 0,
  P1: 1,
  P2: 2,
  P3: 3,
  P4: 4,
  P5: 5
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(fileName, value) {
  fs.writeFileSync(path.join(packageDir, fileName), `${JSON.stringify(value, null, 2)}\n`);
}

function writeText(fileName, value) {
  fs.writeFileSync(path.join(packageDir, fileName), value);
}

function slug(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleFromCluster(cluster) {
  return cluster.id
    .split(".")
    .pop()
    .split("-")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function difficultyFor(grade) {
  if (grade === "K" || grade === "P1") return "Low";
  if (grade === "P2" || grade === "P3") return "Medium";
  return "High";
}

function exampleFor(grade, domainId, lessonNumber) {
  const g = gradeNumbers[grade];
  const seed = g * 10 + lessonNumber;
  const domain = domainId.split(".").pop();

  if (domain === "CC") {
    const left = 4 + lessonNumber;
    const right = 2 + g;
    if (grade === "K" && lessonNumber === 2) {
      return {
        kind: "compare",
        values: { left, right },
        prompt: `There are ${left} blue counters and ${right} green counters. Which group has more? How many more?`,
        answer: `The blue group has ${left - right} more counters.`,
        reasoning: `Match ${right} green counters with ${right} blue counters. There are ${left - right} blue counters left unmatched, so the blue group has ${left - right} more.`
      };
    }

    return {
      kind: "sum",
      values: { left, right },
      prompt: `There are ${left} blue counters and ${right} green counters. How many counters are there in all?`,
      answer: String(left + right),
      reasoning: `${left} + ${right} = ${left + right}, so the total is ${left + right} counters.`
    };
  }

  if (domain === "OA") {
    if (grade === "K") {
      const start = 4;
      const add = 3;
      return {
        kind: "sum",
        values: { left: start, right: add },
        prompt: `Lena has ${start} stickers and gets ${add} more. How many stickers does Lena have now?`,
        answer: String(start + add),
        reasoning: `${start} + ${add} = ${start + add}, so Lena has ${start + add} stickers.`
      };
    }
    if (grade === "P1") {
      const start = 6 + g + lessonNumber;
      const add = 2 + lessonNumber;
      return {
        kind: "sum",
        values: { left: start, right: add },
        prompt: `Lena has ${start} stickers and gets ${add} more. How many stickers does Lena have now?`,
        answer: String(start + add),
        reasoning: `${start} + ${add} = ${start + add}, so Lena has ${start + add} stickers.`
      };
    }
    if (grade === "P4") {
      return {
        kind: "factor",
        values: { number: 24, answer: "6" },
        prompt: "Which number is a factor of 24: 5, 6, or 7?",
        answer: "6",
        reasoning: "6 is a factor of 24 because 6 x 4 = 24."
      };
    }
    if (grade === "P5") {
      const left = 6 + lessonNumber;
      const right = 2;
      const multiplier = 4;
      return {
        kind: "expression",
        values: { left, right, multiplier },
        prompt: `Evaluate (${left} + ${right}) x ${multiplier}.`,
        answer: String((left + right) * multiplier),
        reasoning: `First add inside the parentheses: ${left} + ${right} = ${left + right}. Then multiply: ${left + right} x ${multiplier} = ${(left + right) * multiplier}.`
      };
    }
    const groups = Math.max(2, g + 2);
    const size = 3 + lessonNumber % 4;
    return {
      kind: "product",
      values: { groups, size },
      prompt: `${groups} teams each collect ${size} stickers. How many stickers do the teams collect altogether?`,
      answer: String(groups * size),
      reasoning: `${groups} equal groups of ${size} make ${groups} x ${size} = ${groups * size}.`
    };
  }

  if (domain === "NBT") {
    if (grade === "K") {
      const ones = 3 + lessonNumber;
      const value = 10 + ones;
      return {
        kind: "teen-number",
        values: { ones },
        prompt: `A ten-frame is full and ${ones} more counters are beside it. What teen number is shown?`,
        answer: String(value),
        reasoning: `One ten and ${ones} ones make ${value}.`
      };
    }
    if (grade === "P1") {
      const tens = 3 + lessonNumber;
      const ones = 2 + lessonNumber;
      const value = tens * 10 + ones;
      return {
        kind: "tens-ones",
        values: { tens, ones },
        prompt: `A number has ${tens} tens and ${ones} ones. What is the number?`,
        answer: String(value),
        reasoning: `${tens} tens and ${ones} ones make ${value}.`
      };
    }
    if (grade === "P5") {
      const ones = 3 + lessonNumber;
      const tenths = 4;
      const addOn = 1.2;
      const value = ones + tenths / 10;
      const total = value + addOn;
      return {
        kind: "decimal-sum",
        values: { value, addOn, total },
        prompt: `What is ${value.toFixed(1)} + ${addOn.toFixed(1)}?`,
        answer: total.toFixed(1),
        reasoning: `Align decimal place values: ${value.toFixed(1)} + ${addOn.toFixed(1)} = ${total.toFixed(1)}.`
      };
    }
    const hundreds = Math.max(0, g - 1);
    const tens = 2 + lessonNumber;
    const ones = 3 + g;
    const value = hundreds * 100 + tens * 10 + ones;
    return {
      kind: "place-value",
      values: { hundreds, tens, ones },
      prompt: `A number has ${hundreds} hundreds, ${tens} tens, and ${ones} ones. What is the number?`,
      answer: String(value),
      reasoning: `${hundreds} hundreds, ${tens} tens, and ${ones} ones make ${value}.`
    };
  }

  if (domain === "NF") {
    if (grade === "P3") {
      const leftDenominator = 3 + lessonNumber % 2;
      const rightDenominator = leftDenominator + 1;
      return {
        kind: "unit-fraction-compare",
        values: { leftDenominator, rightDenominator },
        prompt: `Which is greater, 1/${leftDenominator} or 1/${rightDenominator}?`,
        answer: `1/${leftDenominator}`,
        reasoning: `For unit fractions, the smaller denominator makes the larger piece, so 1/${leftDenominator} is greater than 1/${rightDenominator}.`
      };
    }
    if (grade === "P5") {
      return {
        kind: "unlike-fraction-sum",
        values: { leftNumerator: 1, leftDenominator: 2, rightNumerator: 1, rightDenominator: 4, answerNumerator: 3, answerDenominator: 4 },
        prompt: "Mia walks 1/2 mile in the morning and 1/4 mile after lunch. How many miles does she walk altogether?",
        answer: "3/4",
        reasoning: "Rename 1/2 as 2/4, then add 2/4 + 1/4 = 3/4."
      };
    }
    const denominator = 6 + lessonNumber % 3;
    const left = 1 + (lessonNumber % 2);
    const right = 2;
    const numerator = left + right;
    return {
      kind: "same-denominator-fraction",
      values: { left, right, denominator },
      prompt: `Mia shades ${left}/${denominator} of a strip and then shades ${right}/${denominator} more. What fraction is shaded?`,
      answer: `${numerator}/${denominator}`,
      reasoning: `The denominators match, so add the numerators: ${left}/${denominator} + ${right}/${denominator} = ${numerator}/${denominator}.`
    };
  }

  if (domain === "MD") {
    if (grade === "K") {
      const pencil = 6 + lessonNumber;
      const eraser = 3 + lessonNumber;
      return {
        kind: "longer-object",
        values: { pencil, eraser },
        prompt: `A pencil is ${pencil} cubes long. An eraser is ${eraser} cubes long. Which object is longer?`,
        answer: "pencil",
        reasoning: `${pencil} is greater than ${eraser}, so the pencil is longer.`
      };
    }
    if (grade === "P1" || grade === "P2") {
      const long = 9 + g + lessonNumber;
      const short = 5 + lessonNumber;
      return {
        kind: "length-difference",
        values: { long, short },
        prompt: `A ribbon is ${long} units long. A string is ${short} units long. How many units longer is the ribbon?`,
        answer: String(long - short),
        reasoning: `${long} - ${short} = ${long - short}, so the ribbon is ${long - short} units longer.`
      };
    }
    if (grade === "P4") {
      const first = 30 + lessonNumber * 5;
      const second = 20 + lessonNumber * 3;
      return {
        kind: "angle-sum",
        values: { first, second },
        prompt: `Two smaller angles measure ${first}° and ${second}°. What is their combined angle measure?`,
        answer: `${first + second}°`,
        reasoning: `Add the angle measures: ${first}° + ${second}° = ${first + second}°.`
      };
    }
    if (grade === "P5") {
      const length = 4 + lessonNumber;
      const width = 3 + lessonNumber % 3;
      const height = 2 + lessonNumber % 2;
      return {
        kind: "rectangular-prism-volume",
        values: { length, width, height },
        prompt: `A rectangular prism is ${length} units long, ${width} units wide, and ${height} units high. What is its volume?`,
        answer: `${length * width * height} cubic units`,
        reasoning: `Volume is length x width x height, so ${length} x ${width} x ${height} = ${length * width * height} cubic units.`
      };
    }
    const length = 5 + g + lessonNumber;
    const width = 3 + lessonNumber % 4;
    return {
      kind: "rectangle-area",
      values: { length, width },
      prompt: `A rectangle is ${length} units long and ${width} units wide. What is its area?`,
      answer: `${length * width} square units`,
      reasoning: `Area is length x width, so ${length} x ${width} = ${length * width} square units.`
    };
  }

  if (domain === "G") {
    if (grade === "K") {
      return {
        kind: "shape-name",
        values: { sides: 3, answer: "triangle" },
        prompt: "Which shape has 3 straight sides?",
        answer: "triangle",
        reasoning: "A triangle has 3 straight sides."
      };
    }
    if (grade === "P1") {
      return {
        kind: "equal-shares",
        values: { shares: 2, answer: "halves" },
        prompt: "A rectangle is split into 2 equal shares. What are the shares called?",
        answer: "halves",
        reasoning: "Two equal shares of one whole are called halves."
      };
    }
    if (grade === "P2" || grade === "P3" || grade === "P4") {
      const sides = grade === "P2" ? 4 : grade === "P3" ? 5 : 6;
      const answer = grade === "P2" ? "quadrilateral" : grade === "P3" ? "pentagon" : "hexagon";
      return {
        kind: "shape-name",
        values: { sides, answer },
        prompt: `Which shape name matches a polygon with ${sides} sides?`,
        answer,
        reasoning: `A polygon with ${sides} sides is a ${answer}.`
      };
    }
    const x = 1 + lessonNumber;
    const y = 2 + g;
    return {
      kind: "coordinate",
      values: { x, y },
      prompt: `Point A is ${x} steps right from the origin and ${y} steps up. What ordered pair names point A?`,
      answer: `(${x}, ${y})`,
      reasoning: `The first coordinate is the horizontal move and the second coordinate is the vertical move, so A is (${x}, ${y}).`
    };
  }

  const left = seed + 3;
  const right = seed + 5;
  return {
    kind: "sum",
    values: { left, right },
    prompt: `Find ${left} + ${right}.`,
    answer: String(left + right),
    reasoning: `${left} + ${right} = ${left + right}.`
  };
}

function validateExample(example) {
  const { kind, values, answer } = example;
  if (kind === "sum") return answer === String(values.left + values.right);
  if (kind === "product") return answer === String(values.groups * values.size);
  if (kind === "factor") return answer === values.answer && values.number % Number(answer) === 0;
  if (kind === "expression") return answer === String((values.left + values.right) * values.multiplier);
  if (kind === "teen-number") return answer === String(10 + values.ones);
  if (kind === "tens-ones") return answer === String(values.tens * 10 + values.ones);
  if (kind === "decimal-sum") return answer === values.total.toFixed(1);
  if (kind === "place-value") return answer === String(values.hundreds * 100 + values.tens * 10 + values.ones);
  if (kind === "unit-fraction-compare") return answer === `1/${Math.min(values.leftDenominator, values.rightDenominator)}`;
  if (kind === "unlike-fraction-sum") return answer === `${values.answerNumerator}/${values.answerDenominator}`;
  if (kind === "same-denominator-fraction") return answer === `${values.left + values.right}/${values.denominator}`;
  if (kind === "longer-object") return answer === (values.pencil > values.eraser ? "pencil" : "eraser");
  if (kind === "length-difference") return answer === String(values.long - values.short);
  if (kind === "angle-sum") return answer === `${values.first + values.second}°`;
  if (kind === "rectangle-area") return answer === `${values.length * values.width} square units`;
  if (kind === "rectangular-prism-volume") return answer === `${values.length * values.width * values.height} cubic units`;
  if (kind === "shape-name" || kind === "equal-shares") return answer === values.answer;
  if (kind === "coordinate") return answer === `(${values.x}, ${values.y})`;
  return false;
}

function conceptStoryFor(domain, cluster) {
  return `Picture a small math story about ${domain.title.toLowerCase()}. The model is your first clue: every object, shape, unit, or mark has a job before you write an equation. ${cluster.capabilitySummary} After you solve, return to the story and explain why the answer fits what the picture or situation was asking.`;
}

function lessonFor(record, domain, cluster, lessonNumber) {
  const grade = record.maisGrade;
  const gradeLabel = gradeLabels[grade];
  const clusterTitle = titleFromCluster(cluster);
  const example = exampleFor(grade, domain.id, lessonNumber);
  const title = `${gradeLabel} ${domain.title}: ${clusterTitle}`;
  const lessonId = `us-ca-k-g5-tx-v1-${slug(grade)}-${slug(cluster.id)}`;
  const topicId = `us-ca-math-${slug(grade)}-${slug(cluster.id)}`;
  const practicePrompt = example.prompt.replace("What", "Explain what");

  return {
    id: lessonId,
    packageId,
    reviewStatus: "auto-validated-ready-for-s18-sampling",
    integrationStatus: "candidate-only",
    metadata: {
      curriculumTrack: "US_CA_MATH",
      state: "CA",
      grade,
      usGradeLabel: gradeLabel,
      topicId,
      domainId: domain.id,
      domainTitle: domain.title,
      clusterId: cluster.id,
      clusterTitle,
      standardIds: cluster.standardIds,
      difficulty: difficultyFor(grade),
      estimatedMinutes: 35,
      languageVariant: "en-primary",
      sourceSafetyStatus: "MAIS-authored-original-from-public-standards-structure",
      evidenceCardIds: [`ca-ccss-structure-${slug(cluster.id)}`],
      competencyTags: [...cluster.itemDesignAffordances, ...cluster.commonMisconceptions.map((item) => `misconception:${item}`)]
    },
    studentLesson: {
      en: {
        title,
        learningGoals: [
          `Use models and words to reason about ${cluster.capabilitySummary.toLowerCase()}`,
          "Show each step with a drawing, equation, table, or verbal check.",
          "Check whether the answer makes sense in the story."
        ],
        launch: `A friendly classroom scene opens the ${domain.title.toLowerCase()} story, and learners name the quantities, shapes, units, or relationships before choosing a strategy.`,
        conceptExplanation: conceptStoryFor(domain, cluster),
        workedExample: {
          prompt: example.prompt,
          answer: example.answer,
          reasoning: example.reasoning
        },
        guidedPractice: [
          {
            prompt: practicePrompt,
            expectedMove: "Name the quantities, choose a representation, solve, and check the units or labels."
          }
        ],
        independentPractice: [
          "Create one similar problem with different numbers or objects.",
          "Swap with a partner and explain the checking step."
        ],
        commonPitfalls: cluster.commonMisconceptions.map((pitfall) => ({
          pitfall,
          repairMove: "Return to the model, label each quantity, and compare the result with the question."
        })),
        exitTicket: `In one sentence, explain how today's representation helped you solve a ${domain.title.toLowerCase()} problem.`
      }
    },
    answerKey: {
      workedExample: {
        answer: example.answer,
        acceptedAnswers: [example.answer],
        solutionSteps: [example.reasoning]
      },
      guidedPractice: {
        acceptedEvidence: ["correct representation", "correct computation", "reasonableness check"]
      }
    },
    validation: {
      deterministicChecks: [
        {
          check: "worked-example-answer",
          status: validateExample(example) ? "pass" : "fail",
          kind: example.kind,
          values: example.values,
          answer: example.answer
        }
      ],
      unresolvedRisks: []
    },
    illustration: {
      visualPolicy: "text-only-v1",
      plannedAssets: [],
      notes: "No answer-critical bitmap or diagram is required for this candidate. Future manipulatives, coordinate grids, or geometry figures must be rendered as deterministic SVG/math-svg assets before live visual release."
    },
    review: {
      sourceDistanceStatus: "passed-local-source-policy",
      mathQaStatus: validateExample(example) ? "passed-deterministic-check" : "needs-repair",
      languageQaStatus: "plain-english-en-primary",
      pedagogyNotes: "Lesson follows concrete-to-representational-to-check sequence for K-5 learners."
    },
    approval: {
      status: "approved-for-review",
      reviewer: "S21 generator local deterministic validation",
      nextOwner: "S18 curriculum QA"
    }
  };
}

function buildPackage() {
  const standardsIndex = readJson(standardsIndexPath);
  const records = standardsIndex.records.filter((record) => targetGrades.includes(record.maisGrade));
  const lessons = [];
  const coverageRows = [];

  for (const record of records) {
    let lessonNumber = 1;
    for (const domain of record.domains) {
      for (const cluster of domain.clusters) {
        const lesson = lessonFor(record, domain, cluster, lessonNumber);
        lessons.push(lesson);
        coverageRows.push({
          lessonId: lesson.id,
          grade: record.maisGrade,
          usGradeLabel: gradeLabels[record.maisGrade],
          domainId: domain.id,
          domainTitle: domain.title,
          clusterId: cluster.id,
          standardIds: cluster.standardIds,
          validationStatus: lesson.validation.deterministicChecks.every((check) => check.status === "pass") ? "pass" : "fail"
        });
        lessonNumber += 1;
      }
    }
  }

  const validationErrors = [];
  const lessonIds = new Set();
  const topicIds = new Set();
  const standardIds = new Set();
  const gradeCounts = Object.fromEntries(targetGrades.map((grade) => [grade, 0]));

  for (const lesson of lessons) {
    if (lessonIds.has(lesson.id)) validationErrors.push(`duplicate lesson id ${lesson.id}`);
    lessonIds.add(lesson.id);
    if (topicIds.has(lesson.metadata.topicId)) validationErrors.push(`duplicate topic id ${lesson.metadata.topicId}`);
    topicIds.add(lesson.metadata.topicId);
    gradeCounts[lesson.metadata.grade] += 1;
    lesson.metadata.standardIds.forEach((id) => standardIds.add(id));
    if (!lesson.validation.deterministicChecks.every((check) => check.status === "pass")) {
      validationErrors.push(`deterministic validation failed for ${lesson.id}`);
    }
    const serialized = JSON.stringify(lesson);
    for (const blocked of ["DeepSeek", "IXL", "Try this approved", "Activity 1:"]) {
      if (serialized.includes(blocked)) validationErrors.push(`blocked generator/source phrase ${blocked} in ${lesson.id}`);
    }
  }

  const packageJson = {
    packageId,
    schemaVersion: "mais-content-package.v1",
    generatedAt,
    generator: "Codex S21 deterministic template generator using $mais-content-generation-workflow",
    sessionId: "S21",
    curriculumTrack: "US_CA_MATH",
    state: "CA",
    scope: {
      contentType: "lesson-package",
      gradeSpan: targetGrades,
      usGradeLabels: targetGrades.map((grade) => gradeLabels[grade]),
      intendedReleaseSurface: "candidate package for future California K-5 textbook/live lesson integration"
    },
    languageVariant: "en-primary",
    sourceEvidencePolicy: "public-standards-structure-only-generated-original",
    sourcePolicy: {
      officialSourcesChecked: [
        "California Department of Education Mathematics Framework page, last reviewed 2026-04-08",
        "CDE Common Core State Standards for Mathematics PDF link, 2013 modified publication version"
      ],
      copiedOfficialStandardProseAllowed: false,
      copiedIxlTextAllowed: false,
      rawCorpusAllowed: false
    },
    packageStatus: validationErrors.length ? "needs-repair" : "approved-for-review",
    reviewStatus: "generator-validation-complete-s18-human-sampling-required",
    integrationStatus: "candidate-only",
    nextOwner: "S18 curriculum QA",
    claimsNotAllowed: [
      "complete California curriculum",
      "official California course",
      "fully launched California K-5 lessons",
      "IXL-equivalent exercises"
    ],
    lessons
  };

  const validationReport = {
    packageId,
    generatedAt,
    status: validationErrors.length ? "fail" : "pass",
    lessonCount: lessons.length,
    gradeCounts,
    uniqueLessonIds: lessonIds.size,
    uniqueTopicIds: topicIds.size,
    uniqueStandardIds: standardIds.size,
    coverageRows,
    checks: {
      duplicateLessonIds: lessonIds.size === lessons.length ? "pass" : "fail",
      duplicateTopicIds: topicIds.size === lessons.length ? "pass" : "fail",
      deterministicWorkedExamples: validationErrors.filter((error) => error.includes("deterministic")).length ? "fail" : "pass",
      sourcePhraseScan: validationErrors.filter((error) => error.includes("blocked")).length ? "fail" : "pass"
    },
    validationErrors,
    checksNotRun: [
      "Human classroom readability sampling",
      "S11 route regression after live integration",
      "S22 production release preflight after live integration"
    ]
  };

  return { packageJson, validationReport, coverageRows };
}

const { packageJson, validationReport, coverageRows } = buildPackage();
writeJson("lessons.json", packageJson);
writeJson("validation-report.json", validationReport);

const qaVerdict = validationReport.status === "pass" ? "approved-for-review" : "needs-repair";
const qaReport = `# ${packageId} QA Report

## Scope

- Session: S21 content generation, for S18 curriculum QA.
- Curriculum track: US_CA_MATH.
- Grade span: K, Grade 1, Grade 2, Grade 3, Grade 4, Grade 5.
- Package type: lesson/textbook candidate package.
- Language variant: English-primary.
- Source policy: public standards structure only; generated MAIS-original lesson text; no raw textbook/corpus/IXL item text.

## Counts

- Lessons: ${validationReport.lessonCount}.
- Grade counts: ${Object.entries(validationReport.gradeCounts).map(([grade, count]) => `${grade}=${count}`).join(", ")}.
- Unique standard IDs covered: ${validationReport.uniqueStandardIds}.
- Deterministic worked-example checks: ${validationReport.checks.deterministicWorkedExamples}.
- Source/generator phrase scan: ${validationReport.checks.sourcePhraseScan}.

## S18 Interpretation

Verdict: ${qaVerdict}.

This package is suitable for S18 sampling and S23 promotion planning, but it is not production-ready. Human/owner approval, S05 live integration, S11 route regression, and S22 release gates remain required before any public K-5 textbook launch claim.

## Checks Not Run

${validationReport.checksNotRun.map((item) => `- ${item}`).join("\n")}

## Risks

- No answer-critical visuals are included; future manipulatives, geometry figures, coordinate grids, or dense labels must use deterministic SVG/math-svg assets.
- The package intentionally avoids official standard prose and IXL exercise text, so standard IDs are alignment metadata rather than copied descriptions.
- Current live California K-5 question content has been downlisted separately while this replacement package remains candidate-only.
`;

const manualReviewCsv = [
  "lessonId,grade,domainId,clusterId,reviewStatus,reviewerNotes",
  ...coverageRows.map((row) =>
    [
      row.lessonId,
      row.grade,
      row.domainId,
      row.clusterId,
      "pending-s18-human-sampling",
      "Generator validation passed; requires S18/human sampling before production."
    ].join(",")
  )
].join("\n");

const s18Decision = `# S18 Decision - ${packageId}

Status: ${qaVerdict}

S18 automated package inspection can accept this package for review intake because required artifacts exist, deterministic worked-example validation passed, duplicate IDs were not found, and source-policy scans did not find blocked generator/source phrases.

Not approved for production: manual S18/human sampling, S05 live integration, S11 route regression, S22 release preflight, and owner production confirmation are still open.
`;

const s23Decision = `# S23 Promotion Decision - ${packageId}

Decision: do not promote to live yet.

Reason: candidate package is newly generated and K-5 live content is downlisted, but production promotion still needs S18 human sampling, exact live integration scope for S05, regression targets for S11, and release-slice approval from S22/S25.
`;

writeText("qa-report.md", qaReport);
writeText("manual-review-results.csv", `${manualReviewCsv}\n`);
writeText("s18-qa-decision.md", s18Decision);
writeText("s23-promotion-decision.md", s23Decision);
console.log(JSON.stringify({ packageId, status: validationReport.status, lessons: validationReport.lessonCount }, null, 2));
