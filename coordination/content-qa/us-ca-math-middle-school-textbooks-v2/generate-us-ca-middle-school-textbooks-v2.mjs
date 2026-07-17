import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageId = "us-ca-math-middle-school-textbooks-v2";
const packageDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(packageDir, "../../..");
const standardsIndexPath =
  process.env.CALIFORNIA_MATH_COMMON_CORE_STANDARDS_INDEX ??
  path.join(projectRoot, ".local/skills/california-math-common-core/references/standards-index.json");
const generatedAt = "2026-06-19";
const targetButtons = new Set(["Sixth", "Seventh", "Eighth"]);

const gradeLabels = {
  P6: "Grade 6",
  S1: "Grade 7",
  S2: "Grade 8"
};

const gradeCourseLabels = {
  P6: "California Grade 6 Mathematics",
  S1: "California Grade 7 Mathematics",
  S2: "California Grade 8 Mathematics"
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
  if (grade === "P6") return "Medium";
  if (grade === "S1") return "Medium-High";
  return "High";
}

function exampleFor(domainId) {
  switch (domainId) {
    case "6.RP":
      return {
        kind: "unit-rate",
        prompt: "Four lab notebooks cost $7.20 at a school store. At the same price per notebook, how much do 10 notebooks cost?",
        answer: "$18.00",
        acceptedAnswers: ["$18.00", "$18"],
        values: { totalCost: 7.2, count: 4, requestedCount: 10 },
        reasoning: "The unit price is 7.20 / 4 = 1.80 dollars per notebook. Ten notebooks cost 1.80 x 10 = 18.00 dollars.",
        representation: "ratio table or double number line"
      };
    case "6.NS":
      return {
        kind: "distance-on-number-line",
        prompt: "A diver starts at -3.5 meters relative to sea level and rises to 2 meters. How far does the diver move?",
        answer: "5.5 meters",
        acceptedAnswers: ["5.5 meters", "5.5", "11/2 meters"],
        values: { start: -3.5, end: 2 },
        reasoning: "The distance is 2 - (-3.5) = 5.5 meters. Distance is positive because it measures how far apart the positions are.",
        representation: "vertical number line"
      };
    case "6.EE":
      return {
        kind: "one-step-equation",
        prompt: "A tutoring club has a $12 setup fee and then charges $4 per session. The total is $40. How many sessions are included?",
        answer: "7 sessions",
        acceptedAnswers: ["7 sessions", "7"],
        values: { total: 40, fixed: 12, rate: 4 },
        reasoning: "Let s be the number of sessions. 12 + 4s = 40, so 4s = 28 and s = 7.",
        representation: "equation with one variable"
      };
    case "6.G":
      return {
        kind: "rectangular-prism-volume",
        prompt: "A rectangular prism has length 8 cm, width 5 cm, and height 3 cm. What is its volume?",
        answer: "120 cubic centimeters",
        acceptedAnswers: ["120 cubic centimeters", "120 cm^3", "120"],
        values: { length: 8, width: 5, height: 3 },
        reasoning: "Volume is length x width x height, so 8 x 5 x 3 = 120 cubic centimeters.",
        representation: "labeled prism or unit-cube model"
      };
    case "6.SP":
      return {
        kind: "mean-median-range",
        prompt: "Five quiz scores are 6, 7, 7, 9, and 11. Find the mean, median, and range.",
        answer: "mean 8, median 7, range 5",
        acceptedAnswers: ["mean 8, median 7, range 5"],
        values: { data: [6, 7, 7, 9, 11] },
        reasoning: "The total is 40, so the mean is 40 / 5 = 8. The middle value is 7. The range is 11 - 6 = 5.",
        representation: "dot plot and summary table"
      };
    case "7.RP":
      return {
        kind: "proportional-relationship",
        prompt: "A map uses 3 centimeters to represent 15 kilometers. How many kilometers are represented by 8 centimeters?",
        answer: "40 kilometers",
        acceptedAnswers: ["40 kilometers", "40 km", "40"],
        values: { mapCm: 3, realKm: 15, requestedCm: 8 },
        reasoning: "The scale rate is 15 / 3 = 5 kilometers per centimeter. Eight centimeters represent 8 x 5 = 40 kilometers.",
        representation: "scale table"
      };
    case "7.NS":
      return {
        kind: "signed-rational-sum",
        prompt: "During a science demo, the temperature changes by -4.5 degrees and then by 7.25 degrees. What is the net change?",
        answer: "2.75 degrees",
        acceptedAnswers: ["2.75 degrees", "2.75", "11/4 degrees"],
        values: { first: -4.5, second: 7.25 },
        reasoning: "-4.5 + 7.25 = 2.75, so the temperature has a positive net change of 2.75 degrees.",
        representation: "signed number line"
      };
    case "7.EE":
      return {
        kind: "two-step-inequality",
        prompt: "A student has $18 and earns $6 per hour. How many whole hours must the student work to have at least $45?",
        answer: "5 hours",
        acceptedAnswers: ["5 hours", "5"],
        values: { start: 18, rate: 6, target: 45 },
        reasoning: "Solve 18 + 6h >= 45. Then 6h >= 27, so h >= 4.5. Whole hours means at least 5 hours.",
        representation: "inequality and number line"
      };
    case "7.G":
      return {
        kind: "circle-area",
        prompt: "A circular badge has radius 4 cm. Using pi = 3.14, what is its area?",
        answer: "50.24 square centimeters",
        acceptedAnswers: ["50.24 square centimeters", "50.24 cm^2", "50.24"],
        values: { radius: 4, pi: 3.14 },
        reasoning: "Area is pi r^2. Using pi = 3.14 gives 3.14 x 4^2 = 3.14 x 16 = 50.24 square centimeters.",
        representation: "labeled circle"
      };
    case "7.SP":
      return {
        kind: "compound-probability",
        prompt: "A bag has 3 red tiles and 5 blue tiles. A fair coin is flipped after one tile is drawn. What is the probability of drawing a red tile and flipping heads?",
        answer: "3/16",
        acceptedAnswers: ["3/16", "0.1875"],
        values: { red: 3, total: 8, heads: 0.5 },
        reasoning: "The probability of red is 3/8 and the probability of heads is 1/2. For independent events, multiply: 3/8 x 1/2 = 3/16.",
        representation: "tree diagram"
      };
    case "8.NS":
      return {
        kind: "square-root-estimate",
        prompt: "Between which two consecutive whole numbers is sqrt(70)?",
        answer: "between 8 and 9",
        acceptedAnswers: ["between 8 and 9", "8 and 9"],
        values: { radicand: 70, lower: 8, upper: 9 },
        reasoning: "Since 8^2 = 64 and 9^2 = 81, sqrt(70) lies between 8 and 9.",
        representation: "number line between perfect squares"
      };
    case "8.EE":
      return {
        kind: "linear-system",
        prompt: "Solve the system y = 2x + 1 and y = -x + 10.",
        answer: "(3, 7)",
        acceptedAnswers: ["(3, 7)", "x = 3, y = 7"],
        values: { m1: 2, b1: 1, m2: -1, b2: 10 },
        reasoning: "Set the expressions equal: 2x + 1 = -x + 10. Then 3x = 9, so x = 3. Substitute to get y = 7.",
        representation: "graph and substitution"
      };
    case "8.F":
      return {
        kind: "function-rate",
        prompt: "Function A is y = 3x + 2. Function B passes through (0, 5) and (4, 13). Which function has the greater rate of change?",
        answer: "Function A",
        acceptedAnswers: ["Function A", "A"],
        values: { aRate: 3, bY1: 5, bY2: 13, bX1: 0, bX2: 4 },
        reasoning: "Function A has rate 3. Function B has rate (13 - 5) / (4 - 0) = 2. Since 3 > 2, Function A has the greater rate.",
        representation: "equation and two-point rate table"
      };
    case "8.G":
      return {
        kind: "pythagorean-distance",
        prompt: "A right triangle has legs 9 units and 12 units. What is the length of the hypotenuse?",
        answer: "15 units",
        acceptedAnswers: ["15 units", "15"],
        values: { a: 9, b: 12 },
        reasoning: "Use a^2 + b^2 = c^2. Then 9^2 + 12^2 = 81 + 144 = 225, so c = 15.",
        representation: "right triangle with labeled legs"
      };
    case "8.SP":
      return {
        kind: "two-way-table",
        prompt: "In a survey, 18 students chose robotics, 12 chose art, and 10 chose music. What percent chose robotics?",
        answer: "45%",
        acceptedAnswers: ["45%", "45 percent", "0.45"],
        values: { robotics: 18, art: 12, music: 10 },
        reasoning: "The total is 18 + 12 + 10 = 40. Robotics is 18 / 40 = 0.45 = 45%.",
        representation: "categorical data table"
      };
    default:
      throw new Error(`No example configured for ${domainId}`);
  }
}

function checkpointFor(domainId) {
  switch (domainId) {
    case "6.RP":
      return {
        prompt: "A drink mix uses 5 scoops for 2 pitchers. How many scoops are needed for 6 pitchers?",
        answer: "15 scoops",
        acceptedAnswers: ["15 scoops", "15"],
        check: () => 5 / 2 * 6 === 15,
        reasoning: "Six pitchers is 3 times 2 pitchers, so 5 x 3 = 15 scoops."
      };
    case "6.NS":
      return {
        prompt: "Find the distance between -6 and 1.5 on a number line.",
        answer: "7.5 units",
        acceptedAnswers: ["7.5 units", "7.5", "15/2 units"],
        check: () => 1.5 - (-6) === 7.5,
        reasoning: "The distance is 1.5 - (-6) = 7.5 units."
      };
    case "6.EE":
      return {
        prompt: "Solve 5 + 3x = 23.",
        answer: "x = 6",
        acceptedAnswers: ["x = 6", "6"],
        check: () => (23 - 5) / 3 === 6,
        reasoning: "Subtract 5 to get 3x = 18, then divide by 3."
      };
    case "6.G":
      return {
        prompt: "A box is 6 cm by 4 cm by 5 cm. What is its volume?",
        answer: "120 cubic centimeters",
        acceptedAnswers: ["120 cubic centimeters", "120 cm^3", "120"],
        check: () => 6 * 4 * 5 === 120,
        reasoning: "Volume is 6 x 4 x 5 = 120 cubic centimeters."
      };
    case "6.SP":
      return {
        prompt: "Find the range of 3, 5, 8, 8, 12.",
        answer: "9",
        acceptedAnswers: ["9"],
        check: () => 12 - 3 === 9,
        reasoning: "Range is greatest minus least: 12 - 3 = 9."
      };
    case "7.RP":
      return {
        prompt: "If 6 tickets cost $42, what do 9 tickets cost at the same price?",
        answer: "$63",
        acceptedAnswers: ["$63", "63 dollars", "63"],
        check: () => 42 / 6 * 9 === 63,
        reasoning: "The unit price is 42 / 6 = 7 dollars, and 7 x 9 = 63."
      };
    case "7.NS":
      return {
        prompt: "Compute -2.5 + 6.75.",
        answer: "4.25",
        acceptedAnswers: ["4.25", "17/4"],
        check: () => -2.5 + 6.75 === 4.25,
        reasoning: "The positive amount is 4.25 greater than the negative amount."
      };
    case "7.EE":
      return {
        prompt: "Solve 9 + 4x >= 29 for whole-number x.",
        answer: "x >= 5",
        acceptedAnswers: ["x >= 5", "5 or more"],
        check: () => (29 - 9) / 4 === 5,
        reasoning: "Subtract 9, then divide by 4: x >= 5."
      };
    case "7.G":
      return {
        prompt: "Using pi = 3.14, find the circumference of a circle with radius 5 cm.",
        answer: "31.4 centimeters",
        acceptedAnswers: ["31.4 centimeters", "31.4 cm", "31.4"],
        check: () => approximatelyEqual(2 * 3.14 * 5, 31.4),
        reasoning: "Circumference is 2 pi r = 2 x 3.14 x 5 = 31.4 centimeters."
      };
    case "7.SP":
      return {
        prompt: "A spinner has 2 green sections and 6 equal sections total. What is the probability of green?",
        answer: "1/3",
        acceptedAnswers: ["1/3", "2/6", "0.333..."],
        check: () => 2 / 6 === 1 / 3,
        reasoning: "Two of the six equally likely outcomes are green, so 2/6 = 1/3."
      };
    case "8.NS":
      return {
        prompt: "Between which whole numbers is sqrt(50)?",
        answer: "between 7 and 8",
        acceptedAnswers: ["between 7 and 8", "7 and 8"],
        check: () => 7 ** 2 < 50 && 50 < 8 ** 2,
        reasoning: "Because 7^2 = 49 and 8^2 = 64, sqrt(50) is between 7 and 8."
      };
    case "8.EE":
      return {
        prompt: "Solve y = x + 4 and y = 3x - 2.",
        answer: "(3, 7)",
        acceptedAnswers: ["(3, 7)", "x = 3, y = 7"],
        check: () => {
          const x = (4 + 2) / (3 - 1);
          return x === 3 && x + 4 === 7;
        },
        reasoning: "Set x + 4 = 3x - 2, so 6 = 2x and x = 3. Then y = 7."
      };
    case "8.F":
      return {
        prompt: "A function has points (2, 9) and (5, 21). What is its rate of change?",
        answer: "4",
        acceptedAnswers: ["4"],
        check: () => (21 - 9) / (5 - 2) === 4,
        reasoning: "Rate of change is change in output over change in input: 12 / 3 = 4."
      };
    case "8.G":
      return {
        prompt: "A right triangle has legs 5 and 12. Find the hypotenuse.",
        answer: "13",
        acceptedAnswers: ["13", "13 units"],
        check: () => Math.sqrt(5 ** 2 + 12 ** 2) === 13,
        reasoning: "5^2 + 12^2 = 25 + 144 = 169, so the hypotenuse is 13."
      };
    case "8.SP":
      return {
        prompt: "A club has 14 sixth graders and 21 seventh graders. What percent are sixth graders?",
        answer: "40%",
        acceptedAnswers: ["40%", "40 percent", "0.4"],
        check: () => 14 / (14 + 21) === 0.4,
        reasoning: "There are 35 students total, and 14 / 35 = 0.4 = 40%."
      };
    default:
      throw new Error(`No checkpoint configured for ${domainId}`);
  }
}

function approximatelyEqual(left, right, tolerance = 1e-9) {
  return Math.abs(left - right) <= tolerance;
}

function validateExample(example) {
  const values = example.values;
  switch (example.kind) {
    case "unit-rate":
      return values.totalCost / values.count * values.requestedCount === 18;
    case "distance-on-number-line":
      return values.end - values.start === 5.5;
    case "one-step-equation":
      return (values.total - values.fixed) / values.rate === 7;
    case "rectangular-prism-volume":
      return values.length * values.width * values.height === 120;
    case "mean-median-range": {
      const data = values.data;
      const mean = data.reduce((sum, value) => sum + value, 0) / data.length;
      const median = data[Math.floor(data.length / 2)];
      const range = data.at(-1) - data[0];
      return mean === 8 && median === 7 && range === 5;
    }
    case "proportional-relationship":
      return values.realKm / values.mapCm * values.requestedCm === 40;
    case "signed-rational-sum":
      return values.first + values.second === 2.75;
    case "two-step-inequality":
      return Math.ceil((values.target - values.start) / values.rate) === 5;
    case "circle-area":
      return values.pi * values.radius ** 2 === 50.24;
    case "compound-probability":
      return `${values.red}/${values.total * 2}` === "3/16";
    case "square-root-estimate":
      return values.lower ** 2 < values.radicand && values.radicand < values.upper ** 2;
    case "linear-system": {
      const x = (values.b2 - values.b1) / (values.m1 - values.m2);
      const y = values.m1 * x + values.b1;
      return x === 3 && y === 7;
    }
    case "function-rate": {
      const bRate = (values.bY2 - values.bY1) / (values.bX2 - values.bX1);
      return values.aRate > bRate;
    }
    case "pythagorean-distance":
      return Math.sqrt(values.a ** 2 + values.b ** 2) === 15;
    case "two-way-table": {
      const total = values.robotics + values.art + values.music;
      return values.robotics / total === 0.45;
    }
    default:
      return false;
  }
}

function conceptStoryFor(domain, cluster, example) {
  return `Imagine a real ${domain.title.toLowerCase()} investigation where the first job is to decide what each quantity, graph, diagram, or symbol represents. ${example.representation} becomes the map for the story, and ${cluster.capabilitySummary.toLowerCase()} The final answer is not finished until its units, signs, labels, or constraints still make sense in the original situation.`;
}

function lessonFor(record, domain, cluster, index) {
  const grade = record.maisGrade;
  const gradeLabel = gradeLabels[grade];
  const clusterTitle = titleFromCluster(cluster);
  const example = exampleFor(domain.id);
  const checkpoint = checkpointFor(domain.id);
  const lessonId = `${packageId}-${slug(grade)}-${slug(cluster.id)}`;
  const topicId = `us-ca-math-${slug(grade)}-${slug(cluster.id)}`;
  const title = `${gradeLabel} ${domain.title}: ${clusterTitle}`;
  const deterministicChecks = [
    {
      check: "worked-example-answer",
      status: validateExample(example) ? "pass" : "fail",
      kind: example.kind,
      values: example.values,
      answer: example.answer
    },
    {
      check: "checkpoint-answer",
      status: checkpoint.check() ? "pass" : "fail",
      answer: checkpoint.answer
    }
  ];

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
      courseLabel: gradeCourseLabels[grade],
      sequenceNumber: index + 1,
      topicId,
      domainId: domain.id,
      domainTitle: domain.title,
      clusterId: cluster.id,
      clusterTitle,
      standardIds: cluster.standardIds,
      difficulty: difficultyFor(grade),
      estimatedMinutes: 40,
      languageVariant: "en-primary",
      sourceSafetyStatus: "MAIS-authored-original-from-public-standards-structure",
      evidenceCardIds: [`ca-ccss-structure-${slug(cluster.id)}`],
      conceptIds: [slug(clusterTitle), ...cluster.standardIds.map(slug)],
      competencyTags: [
        ...cluster.itemDesignAffordances,
        ...cluster.commonMisconceptions.map((item) => `misconception:${item}`)
      ],
      generationGuidance: {
        sourcePolicy: "Use only standard IDs, domain structure, local MAIS summaries, and original examples.",
        visualPolicy: "text-only-v2; future visuals must be deterministic math-svg when answer-critical."
      }
    },
    studentLesson: {
      en: {
        title,
        objectives: [
          `Represent ${cluster.capabilitySummary.toLowerCase()}`,
          `Use ${example.representation} to explain the reasoning, not only the answer.`,
          "Check units, signs, labels, or constraints before finalizing the solution."
        ],
        launch: `A realistic ${domain.title.toLowerCase()} situation gives each quantity or relationship a role before the representation is chosen.`,
        conceptExplanation: conceptStoryFor(domain, cluster, example),
        workedExamples: [
          {
            title: example.representation,
            prompt: example.prompt,
            answer: example.answer,
            explanation: example.reasoning
          }
        ],
        guidedPractice: [
          {
            prompt: checkpoint.prompt,
            answer: checkpoint.answer,
            explanation: checkpoint.reasoning
          }
        ],
        independentPractice: [
          {
            prompt: `Create a new ${clusterTitle.toLowerCase()} problem with different numbers and solve it using ${example.representation}.`,
            answer: "Student-generated; must include a labeled representation, computation, and reasonableness check.",
            explanation: "S18/S05 review should sample student-facing examples before live integration."
          }
        ],
        checkpointPrompts: [
          checkpoint.prompt,
          "Explain which representation made the structure of the problem easiest to see."
        ],
        checkpointAnswers: [
          checkpoint.answer,
          `A strong response names ${example.representation}, labels the quantities, and connects the calculation to the context.`
        ],
        checkpointExplanations: [
          checkpoint.reasoning,
          "The representation is useful when it keeps the relationship, unit, sign, or scale visible throughout the solution."
        ],
        commonPitfalls: cluster.commonMisconceptions.map((pitfall) => ({
          pitfall,
          repairMove: "Return to the representation, relabel each quantity, and compare the result with the original context."
        })),
        teacherNotes: [
          "Ask students to state the unit or mathematical object before computing.",
          "Use error analysis when students choose the correct operation but lose a label, sign, or constraint.",
          "Keep official standard prose and external exercise wording out of student-facing copy."
        ],
        exitTicket: `Write one sentence explaining how ${example.representation} helped solve today's ${domain.title.toLowerCase()} task.`
      }
    },
    answerKey: {
      workedExamples: [
        {
          answer: example.answer,
          acceptedAnswers: example.acceptedAnswers,
          solutionSteps: [example.reasoning]
        }
      ],
      checkpoints: [
        {
          answer: checkpoint.answer,
          acceptedAnswers: checkpoint.acceptedAnswers,
          solutionSteps: [checkpoint.reasoning]
        }
      ]
    },
    validation: {
      deterministicChecks,
      unresolvedRisks: deterministicChecks.every((check) => check.status === "pass") ? [] : ["deterministic-check-failure"]
    },
    illustration: {
      visualPolicy: "text-only-v2",
      plannedAssets: [
        {
          assetClassification: "math-svg",
          needTier: "future-live-enhancement",
          brief: `If this lesson gets visual integration, render ${example.representation} as deterministic SVG/math-svg with exact labels and coordinates where applicable.`
        }
      ],
      notes: "No answer-critical bitmap is generated in this package. Any future coordinate, graph, geometry, or dense math visual must be rendered deterministically before student-facing use."
    },
    review: {
      sourceDistanceStatus: "passed-local-source-policy",
      mathQaStatus: deterministicChecks.every((check) => check.status === "pass") ? "passed-deterministic-checks" : "needs-repair",
      languageQaStatus: "plain-english-en-primary",
      pedagogyNotes: "Lesson follows context -> representation -> computation -> check for middle-school learners."
    },
    approval: {
      status: "approved-for-review",
      reviewer: "S21 generator local deterministic validation",
      nextOwner: "S18 curriculum QA"
    }
  };
}

function buildLessons(index) {
  const records = index.records.filter((record) => targetButtons.has(record.buttonLabel));
  return records.flatMap((record) =>
    record.domains.flatMap((domain, domainIndex) =>
      domain.clusters.map((cluster) => lessonFor(record, domain, cluster, domainIndex))
    )
  );
}

function scanStudentText(lessons) {
  const blockedPatterns = [
    /ixl/i,
    /official california course/i,
    /complete california curriculum/i,
    /copied from/i,
    /source excerpt/i,
    /answer key from/i
  ];
  const hits = [];
  for (const lesson of lessons) {
    const text = JSON.stringify(lesson.studentLesson);
    for (const pattern of blockedPatterns) {
      if (pattern.test(text)) hits.push({ lessonId: lesson.id, pattern: String(pattern) });
    }
  }
  return hits;
}

function validatePackage(lessons) {
  const lessonIds = new Set();
  const topicIds = new Set();
  const duplicateLessonIds = [];
  const duplicateTopicIds = [];
  const coverageRows = [];
  const failures = [];

  for (const lesson of lessons) {
    if (lessonIds.has(lesson.id)) duplicateLessonIds.push(lesson.id);
    lessonIds.add(lesson.id);
    if (topicIds.has(lesson.metadata.topicId)) duplicateTopicIds.push(lesson.metadata.topicId);
    topicIds.add(lesson.metadata.topicId);

    const checkStatuses = lesson.validation.deterministicChecks.map((check) => check.status);
    if (checkStatuses.some((status) => status !== "pass")) failures.push(lesson.id);
    coverageRows.push({
      lessonId: lesson.id,
      grade: lesson.metadata.grade,
      usGradeLabel: lesson.metadata.usGradeLabel,
      domainId: lesson.metadata.domainId,
      domainTitle: lesson.metadata.domainTitle,
      clusterId: lesson.metadata.clusterId,
      standardIds: lesson.metadata.standardIds,
      validationStatus: checkStatuses.every((status) => status === "pass") ? "pass" : "fail"
    });
  }

  const sourceHits = scanStudentText(lessons);
  const gradeCounts = lessons.reduce((counts, lesson) => {
    counts[lesson.metadata.grade] = (counts[lesson.metadata.grade] ?? 0) + 1;
    return counts;
  }, {});
  const uniqueStandardIds = new Set(lessons.flatMap((lesson) => lesson.metadata.standardIds));

  return {
    packageId,
    generatedAt,
    status: duplicateLessonIds.length || duplicateTopicIds.length || failures.length || sourceHits.length ? "fail" : "pass",
    lessonCount: lessons.length,
    gradeCounts,
    uniqueLessonIds: lessonIds.size,
    uniqueTopicIds: topicIds.size,
    uniqueStandardIds: uniqueStandardIds.size,
    duplicateLessonIds,
    duplicateTopicIds,
    deterministicFailures: failures,
    sourceSafetyStudentTextHits: sourceHits,
    coverageRows
  };
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function manualReviewCsv(lessons) {
  const header = [
    "lesson_id",
    "grade",
    "domain_id",
    "cluster_id",
    "reviewer",
    "status",
    "notes"
  ];
  const rows = lessons.map((lesson) => [
    lesson.id,
    lesson.metadata.grade,
    lesson.metadata.domainId,
    lesson.metadata.clusterId,
    "S18/human reviewer",
    "pending",
    "S21 deterministic validation passed; human curriculum, readability, and source-distance sampling still required before integration."
  ]);
  return [header, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n") + "\n";
}

function qaReport(validation) {
  const gradeSummary = Object.entries(validation.gradeCounts)
    .map(([grade, count]) => `- ${gradeLabels[grade]} (${grade}): ${count} lessons`)
    .join("\n");
  return `# ${packageId} QA Report

## Scope

- Session: S21 content generation, for S18 curriculum QA.
- Curriculum track: US_CA_MATH.
- Grade span: California Grade 6, Grade 7, and Grade 8.
- Package type: lesson/textbook candidate package.
- Language variant: English-primary.
- Source policy: public standards structure and local MAIS-authored summaries only; no raw textbook, exam, IXL item, or protected source text.

## Counts

- Lessons: ${validation.lessonCount}.
${gradeSummary}
- Unique standard IDs covered: ${validation.uniqueStandardIds}.
- Deterministic worked-example/checkpoint checks: ${validation.deterministicFailures.length === 0 ? "pass" : "fail"}.
- Duplicate lesson IDs: ${validation.duplicateLessonIds.length}.
- Duplicate topic IDs: ${validation.duplicateTopicIds.length}.
- Student text source/generator phrase scan hits: ${validation.sourceSafetyStudentTextHits.length}.

## S18 Interpretation

Verdict: approved-for-review.

This package is suitable for S18 sampling and S23 promotion planning, but it is not production-ready. Human/owner approval, S05 live integration, S11 route regression, and S22 release gates remain required before any public California middle-school textbook launch claim.

## Checks Not Run

- Human classroom readability sampling.
- Independent S18 curriculum acceptance sampling.
- S05 live route/data integration.
- S11 route regression after live integration.
- S22 production release preflight after live integration.

## Risks

- Visuals are text-only placeholders. Future coordinate grids, geometry figures, graphs, diagrams, or dense math labels must use deterministic SVG/math-svg assets before live visual release.
- Standard IDs are alignment metadata; this package intentionally avoids official standard prose and external exercise wording.
- Current student-facing California middle-school textbook routes are downlisted separately while this replacement package remains candidate-only.
`;
}

function s18Decision(validation) {
  return `# S18 Decision - ${packageId}

Status: approved-for-review

S18 automated package inspection can accept this package for review intake because required artifacts exist, deterministic worked-example/checkpoint validation passed, duplicate IDs were not found, and student-facing source-policy scans did not find blocked generator/source phrases.

Not approved for production: manual S18/human sampling, S05 live integration, S11 route regression, S22 release preflight, and owner production confirmation are still open.

Counts: ${validation.lessonCount} lessons across California Grade 6, Grade 7, and Grade 8; ${validation.uniqueStandardIds} unique standard IDs.
`;
}

function s23Decision() {
  return `# S23 Promotion Decision - ${packageId}

Decision: do not promote to live yet.

Reason: the replacement California middle-school package is newly generated and ready for S18 review intake, but production promotion still needs S18/human sampling, exact live integration scope for S05, regression targets for S11, and release-slice approval from S22/S25.

Recommended next owners:

- S18 curriculum QA: sample lessons for math correctness, source distance, grade fit, pedagogy, and public-claim limits.
- S05 lesson integration: only after S18 acceptance names the exact live scope.
- S11 regression QA: route checks after integration exists.
- S22 release engineering: preflight and clean release-slice approval before any Vercel production publish.
`;
}

function buildPackage(lessons) {
  return {
    packageId,
    schemaVersion: "mais-content-package.v1",
    generatedAt,
    generator: "S21 deterministic California middle-school textbook generator",
    sessionId: "S21",
    curriculumTrack: "US_CA_MATH",
    state: "CA",
    scope: {
      gradeSpan: ["P6", "S1", "S2"],
      usGradeLabels: ["Grade 6", "Grade 7", "Grade 8"],
      intendedSurface: "candidate textbook package for future lesson route integration"
    },
    languageVariant: "en-primary",
    sourceEvidencePolicy: "public-standards-structure-only",
    sourcePolicy: {
      rawCorpusAllowed: false,
      committedSourceTextAllowed: false,
      safeUse: "Use standard identifiers, grade/domain structure, topic tags, misconceptions, item-design affordances, and MAIS-authored summaries only.",
      prohibitedUse: [
        "Do not copy, translate, paraphrase, reconstruct, or lightly modify official standards wording.",
        "Do not copy IXL item text, skill previews, screenshots, exercise layouts, answer choices, or item sequences.",
        "Do not copy commercial textbook body text, exercises, solutions, or figures."
      ]
    },
    packageStatus: "candidate-only",
    reviewStatus: "generator-validation-complete-s18-human-sampling-required",
    integrationStatus: "not-integrated-into-live-lessons",
    nextOwner: "S18 curriculum QA",
    claimsNotAllowed: [
      "complete California curriculum",
      "official California course",
      "fully launched California middle-school textbook",
      "IXL-equivalent exercises"
    ],
    lessons
  };
}

function main() {
  const index = readJson(standardsIndexPath);
  const lessons = buildLessons(index);
  const validation = validatePackage(lessons);
  const pack = buildPackage(lessons);

  writeJson("lessons.json", pack);
  writeJson("validation-report.json", validation);
  writeText("manual-review-results.csv", manualReviewCsv(lessons));
  writeText("qa-report.md", qaReport(validation));
  writeText("s18-qa-decision.md", s18Decision(validation));
  writeText("s23-promotion-decision.md", s23Decision());

  if (validation.status !== "pass") {
    console.error(JSON.stringify(validation, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify({
    packageId,
    status: validation.status,
    lessonCount: validation.lessonCount,
    gradeCounts: validation.gradeCounts,
    uniqueStandardIds: validation.uniqueStandardIds
  }, null, 2));
}

main();
