#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const outDir = path.join(rootDir, ".tmp/mainland-pep-high-question-illustration-audit");
const require = createRequire(import.meta.url);

const reportDate = process.env.REPORT_DATE ?? formatHktDate(new Date());
const generatedAtHkt = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Hong_Kong",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false
}).format(new Date());

const artifactStem = `${reportDate}-S18-mainland-pep-high-question-illustration`;
const csvPath = path.join(scriptDir, `${artifactStem}-queue.csv`);
const jsonPath = path.join(scriptDir, `${artifactStem}-queue.json`);
const mdPath = path.join(scriptDir, `${artifactStem}-audit.md`);

const typeOrder = new Map([
  ["multiple-choice", 1],
  ["fill-in", 2],
  ["short-answer", 3],
  ["graph", 4]
]);

const gradeOrder = new Map([
  ["S4", 1],
  ["S5", 2],
  ["S6", 3]
]);

const batchOrder = new Map([
  ["seed-v1", 1],
  ["rag-v2", 2],
  ["rag-v3", 3],
  ["rag-v4", 4],
  ["unknown", 99]
]);

const topicConfigs = [
  {
    topicId: "pep-high-s4-plane-vectors",
    tier: "P1",
    category: "平面向量箭头/投影图",
    templateStem: "plane-vector-grid",
    suggestedImageKind: "coordinate-plane vector diagram",
    exactMathLabelsNeeded: "yes: vector names, coordinates, dot-product/projection labels should be deterministic overlays",
    notes: "Use clean grid arrows and projection cues; keep exact formula text outside the image model."
  },
  {
    topicId: "pep-high-s4-solid-geometry-intro",
    tier: "P1",
    category: "立体几何长方体/线面关系图",
    templateStem: "solid-geometry-cuboid",
    suggestedImageKind: "3D wireframe solid diagram",
    exactMathLabelsNeeded: "yes: vertex labels, edge lengths, right-angle cues, and formulas should be deterministic overlays",
    notes: "Prioritize transparent solids and visible auxiliary lines for space-imagination support."
  },
  {
    topicId: "pep-high-s5-space-vectors",
    tier: "P1",
    category: "空间向量与立体几何坐标图",
    templateStem: "space-vector-plane",
    suggestedImageKind: "3D coordinate vector and plane diagram",
    exactMathLabelsNeeded: "yes: point labels, vectors, normals, distances, and angles should be deterministic overlays",
    notes: "Use a neutral 3D coordinate scene with vectors, planes, and angle/distance cues."
  },
  {
    topicId: "pep-high-s5-lines-circles",
    tier: "P1",
    category: "解析几何直线与圆坐标图",
    templateStem: "line-circle-coordinate",
    suggestedImageKind: "coordinate-plane line and circle diagram",
    exactMathLabelsNeeded: "yes: axes, point coordinates, line equations, radius, and distance labels should be deterministic overlays",
    notes: "Use coordinate-plane base art; exact equations should be rendered after generation."
  },
  {
    topicId: "pep-high-s5-conics",
    tier: "P1",
    category: "圆锥曲线坐标图",
    templateStem: "conic-coordinate",
    suggestedImageKind: "coordinate-plane conic section diagram",
    exactMathLabelsNeeded: "yes: axes, foci, vertices, directrix, and equation labels should be deterministic overlays",
    notes: "Separate ellipse/parabola/hyperbola visual templates if later generation needs stricter math fidelity."
  },
  {
    topicId: "pep-high-s6-analytic-geometry-synthesis",
    tier: "P1",
    category: "解析几何综合图",
    templateStem: "analytic-geometry-synthesis",
    suggestedImageKind: "coordinate-plane conic-line-vector synthesis diagram",
    exactMathLabelsNeeded: "yes: all formulas, moving points, intersections, and midpoint/vector labels should be deterministic overlays",
    notes: "Most sensitive category for precision; GPT Image2 should provide base visual composition only."
  },
  {
    topicId: "pep-high-s4-function-properties",
    tier: "P2",
    category: "函数图像/单调区间图",
    templateStem: "function-curve-interval",
    suggestedImageKind: "coordinate-plane function graph",
    exactMathLabelsNeeded: "yes: axes, interval endpoints, function expressions, and value labels should be deterministic overlays",
    notes: "Use curve-shape visuals for domain/range/monotonicity support."
  },
  {
    topicId: "pep-high-s4-exp-log",
    tier: "P2",
    category: "指数/对数互逆曲线图",
    templateStem: "exp-log-inverse-curves",
    suggestedImageKind: "paired exponential-logarithmic curve diagram",
    exactMathLabelsNeeded: "yes: function labels, inverse mirror line, and key point labels should be deterministic overlays",
    notes: "Show inverse-shape intuition; avoid relying on image text for exact logarithms."
  },
  {
    topicId: "pep-high-s4-trigonometry",
    tier: "P2",
    category: "单位圆与三角函数波形图",
    templateStem: "unit-circle-wave",
    suggestedImageKind: "unit-circle and sine-wave diagram",
    exactMathLabelsNeeded: "yes: angle values, signs, period marks, and trigonometric labels should be deterministic overlays",
    notes: "Useful for standard-angle recall and graph-parameter interpretation."
  },
  {
    topicId: "pep-high-s4-complex-numbers",
    tier: "P2",
    category: "复平面点/模长图",
    templateStem: "complex-plane",
    suggestedImageKind: "complex-plane coordinate diagram",
    exactMathLabelsNeeded: "yes: real/imaginary axes, point labels, modulus circles, and conjugate markers should be deterministic overlays",
    notes: "Keep visual emphasis on coordinates, vectors, modulus, and symmetry."
  },
  {
    topicId: "pep-high-s4-probability",
    tier: "P2",
    category: "概率样本空间/摸球图",
    templateStem: "probability-sample-space",
    suggestedImageKind: "sample-space and probability model diagram",
    exactMathLabelsNeeded: "yes: counts, event names, probability fractions, and branch labels should be deterministic overlays",
    notes: "Use bags, colored outcomes, event regions, or sample-space grids depending on later image batch design."
  },
  {
    topicId: "pep-high-s4-statistics",
    tier: "P2",
    category: "统计数据分布图",
    templateStem: "statistics-distribution",
    suggestedImageKind: "bar chart, histogram, or distribution summary diagram",
    exactMathLabelsNeeded: "yes: data values, axes, mean/range/variance labels should be deterministic overlays",
    notes: "The image model should provide uncluttered chart backgrounds; numbers should be overlaid deterministically."
  },
  {
    topicId: "pep-high-s5-derivatives",
    tier: "P2",
    category: "导数曲线/切线图",
    templateStem: "derivative-tangent",
    suggestedImageKind: "function curve with tangent and sign cues",
    exactMathLabelsNeeded: "yes: function expressions, tangent point, derivative values, and interval labels should be deterministic overlays",
    notes: "Use visual cues for tangent slope, stationary points, and sign intervals."
  },
  {
    topicId: "pep-high-s6-counting",
    tier: "P2",
    category: "计数原理分支/槽位图",
    templateStem: "counting-branches-slots",
    suggestedImageKind: "branching tree or arrangement-slot diagram",
    exactMathLabelsNeeded: "yes: item counts, branch names, slot labels, and formulas should be deterministic overlays",
    notes: "Good candidate for reusable branch/slot templates before adding exact counts."
  },
  {
    topicId: "pep-high-s6-random-variables",
    tier: "P2",
    category: "随机变量概率分布图",
    templateStem: "random-variable-distribution",
    suggestedImageKind: "probability distribution bar chart",
    exactMathLabelsNeeded: "yes: variable values, probabilities, expectation, and variance labels should be deterministic overlays",
    notes: "Use distribution bars and center/spread cues, with exact values added outside GPT Image2."
  },
  {
    topicId: "pep-high-s6-bivariate-data",
    tier: "P2",
    category: "成对数据散点/回归图",
    templateStem: "bivariate-scatter-regression",
    suggestedImageKind: "scatter plot with regression line",
    exactMathLabelsNeeded: "yes: axes, regression equation, observed/predicted values, and residual labels should be deterministic overlays",
    notes: "Use residual arrows and trend-line visuals; keep numeric labels deterministic."
  },
  {
    topicId: "pep-high-s6-derivative-synthesis",
    tier: "P2",
    category: "导数综合曲线与参数区域图",
    templateStem: "derivative-synthesis-region",
    suggestedImageKind: "curve, tangent, sign-band, and parameter-region diagram",
    exactMathLabelsNeeded: "yes: expressions, parameter bounds, tangent constraints, and sign labels should be deterministic overlays",
    notes: "Useful as high-level solution scaffold rather than answer-defining image."
  },
  {
    topicId: "pep-high-s6-probability-statistics-synthesis",
    tier: "P2",
    category: "概率统计综合图",
    templateStem: "probability-statistics-synthesis",
    suggestedImageKind: "probability tree plus distribution/data dashboard diagram",
    exactMathLabelsNeeded: "yes: event names, counts, probabilities, distribution values, and data labels should be deterministic overlays",
    notes: "Compose event tree, distribution summary, and data interpretation panels when useful."
  },
  {
    topicId: "pep-high-s6-exam-practice",
    tier: "P2",
    category: "高考综合解题路线图",
    templateStem: "exam-synthesis-strategy-map",
    suggestedImageKind: "multi-step strategy map with math visual anchors",
    exactMathLabelsNeeded: "yes: formulas, step names, checking cues, and any coordinate labels should be deterministic overlays",
    notes: "Use as visual planning support for mixed-practice items."
  },
  {
    topicId: "pep-high-s4-sets-logic",
    tier: "P3",
    category: "集合韦恩图",
    templateStem: "sets-venn",
    suggestedImageKind: "Venn diagram",
    exactMathLabelsNeeded: "yes: set labels, region counts, and universe labels should be deterministic overlays",
    notes: "Optional teaching aid; many items are answerable from enumeration alone."
  },
  {
    topicId: "pep-high-s4-quadratic-inequalities",
    tier: "P3",
    category: "二次函数抛物线/符号表",
    templateStem: "quadratic-parabola-sign-chart",
    suggestedImageKind: "parabola and sign-chart diagram",
    exactMathLabelsNeeded: "yes: roots, vertex, interval signs, and inequality labels should be deterministic overlays",
    notes: "Useful for sign and vertex intuition, but exact numeric labels should not be model-generated."
  },
  {
    topicId: "pep-high-s5-sequences",
    tier: "P3",
    category: "数列阶梯/模式图",
    templateStem: "sequence-staircase-pattern",
    suggestedImageKind: "sequence staircase or term-growth pattern diagram",
    exactMathLabelsNeeded: "yes: term labels, index labels, and summation values should be deterministic overlays",
    notes: "Optional visual support for arithmetic sequences and accumulation."
  }
];

const topicConfigById = new Map(topicConfigs.map((config, index) => [config.topicId, { ...config, topicOrder: index + 1 }]));

const tierPriority = {
  P1: "1_high",
  P2: "2_medium",
  P3: "3_optional"
};

const tierLabels = {
  P1: "P1 high priority",
  P2: "P2 medium priority",
  P3: "P3 optional teaching aid"
};

try {
  run();
} finally {
  fs.rmSync(outDir, { recursive: true, force: true });
}

function run() {
  compileQuestionBank();

  const compiledQuestionsPath = path.join(outDir, "data/mainlandPepHighQuestions.js");
  const {
    mainlandPepHighQuestions,
    mainlandPepHighQuestionGenerationMetadata
  } = require(compiledQuestionsPath);

  const rows = mainlandPepHighQuestions.map((question) =>
    rowForQuestion(question, mainlandPepHighQuestionGenerationMetadata[question.id])
  );

  rows.sort(compareRows);

  const summary = summarize(rows, mainlandPepHighQuestions);
  validate(rows, summary);

  const manualReviewSamples = sampleRowsByCategory(rows, 5);
  const jsonPayload = {
    reportDate,
    generatedAtHkt,
    source: {
      questionBank: "data/mainlandPepHighQuestions.ts",
      metadata: "mainlandPepHighQuestionGenerationMetadata",
      scope: "MAINLAND_PEP_HIGH S4-S6 all teaching-illustration candidates"
    },
    assumptions: [
      "All 4,800 Mainland PEP high-school questions enter the candidate queue under the all-teaching-illustration scope.",
      "GPT Image2 is not called in this audit.",
      "Exact mathematical labels, coordinates, formulas, and answer-defining text should be rendered deterministically after image generation.",
      "Existing public lesson illustrations are lesson-level assets and are not counted as question-level diagrams."
    ],
    validation: summary.validation,
    summary,
    manualReviewSamples,
    queue: rows
  };

  fs.writeFileSync(csvPath, toCsv(rows), "utf8");
  fs.writeFileSync(jsonPath, `${JSON.stringify(jsonPayload, null, 2)}\n`, "utf8");
  fs.writeFileSync(mdPath, toMarkdown(summary, manualReviewSamples), "utf8");

  console.log(JSON.stringify({
    report: path.relative(rootDir, mdPath),
    csv: path.relative(rootDir, csvPath),
    json: path.relative(rootDir, jsonPath),
    totalRows: rows.length,
    byTier: summary.byTier,
    uniqueTemplates: summary.templateSummary.totalUniqueTemplates
  }, null, 2));
}

function compileQuestionBank() {
  fs.rmSync(outDir, { recursive: true, force: true });
  const tscBin = path.join(rootDir, "node_modules/.bin/tsc");
  const result = spawnSync(tscBin, [
    "-p",
    "tsconfig.json",
    "--outDir",
    path.relative(rootDir, outDir),
    "--noEmit",
    "false",
    "--incremental",
    "false",
    "--module",
    "commonjs",
    "--moduleResolution",
    "node"
  ], {
    cwd: rootDir,
    encoding: "utf8"
  });

  if (result.status !== 0) {
    process.stderr.write(result.stdout);
    process.stderr.write(result.stderr);
    throw new Error("Failed to compile TypeScript question bank for illustration audit.");
  }
}

function rowForQuestion(question, metadata) {
  const config = topicConfigById.get(question.topicId);
  if (!config) {
    throw new Error(`Missing illustration classification for topic ${question.topicId} (${question.id}).`);
  }

  const topicZh = localized(question.topic);
  const promptZh = localized(question.prompt);
  const batch = metadata?.batch ?? "unknown";
  const reusableTemplateKey = `${config.tier}:${config.templateStem}:${question.type}`;

  return {
    questionId: question.id,
    grade: question.grade,
    topicId: question.topicId,
    topicZh,
    questionType: question.type,
    batch,
    promptZh,
    answer: question.answer,
    illustrationTier: config.tier,
    illustrationCategory: config.category,
    reusableTemplateKey,
    suggestedImageKind: config.suggestedImageKind,
    exactMathLabelsNeeded: config.exactMathLabelsNeeded,
    generationPriority: tierPriority[config.tier],
    notes: config.notes,
    topicOrder: config.topicOrder
  };
}

function localized(value) {
  return value?.zhHans ?? value?.zh ?? value?.en ?? "";
}

function compareRows(a, b) {
  return (
    a.generationPriority.localeCompare(b.generationPriority) ||
    (gradeOrder.get(a.grade) ?? 99) - (gradeOrder.get(b.grade) ?? 99) ||
    a.topicOrder - b.topicOrder ||
    (typeOrder.get(a.questionType) ?? 99) - (typeOrder.get(b.questionType) ?? 99) ||
    (batchOrder.get(a.batch) ?? 99) - (batchOrder.get(b.batch) ?? 99) ||
    a.questionId.localeCompare(b.questionId)
  );
}

function summarize(rows, rawQuestions) {
  const byGrade = countBy(rows, "grade");
  const byType = countBy(rows, "questionType");
  const byBatch = countBy(rows, "batch");
  const byTier = countBy(rows, "illustrationTier");
  const byCategory = countBy(rows, "illustrationCategory");
  const byTopic = rows.reduce((acc, row) => {
    const key = `${row.illustrationTier} | ${row.topicId} | ${row.topicZh}`;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const templateKeysByTier = {};
  const templateKeysByCategory = {};
  const allTemplateKeys = new Set();

  for (const row of rows) {
    templateKeysByTier[row.illustrationTier] ??= new Set();
    templateKeysByTier[row.illustrationTier].add(row.reusableTemplateKey);
    templateKeysByCategory[row.illustrationCategory] ??= new Set();
    templateKeysByCategory[row.illustrationCategory].add(row.reusableTemplateKey);
    allTemplateKeys.add(row.reusableTemplateKey);
  }

  const templateSummary = {
    totalUniqueTemplates: allTemplateKeys.size,
    byTier: Object.fromEntries(Object.entries(templateKeysByTier).map(([tier, set]) => [tier, set.size])),
    byCategory: Object.fromEntries(Object.entries(templateKeysByCategory).map(([category, set]) => [category, set.size]))
  };

  const lessonIllustrationRoot = path.join(rootDir, "public/lesson-illustrations/mainland-pep-high");
  const lessonIllustrationFiles = listFiles(lessonIllustrationRoot);
  const questionLevelDiagramCount = rawQuestions.filter((question) => Boolean(question.diagram)).length;

  const validation = {
    passed: true,
    checks: [],
    expected: {
      totalRows: 4800,
      byGrade: { S4: 1600, S5: 1600, S6: 1600 },
      byType: { "multiple-choice": 1620, "fill-in": 1590, "short-answer": 1590 },
      byTier: { P1: 1507, P2: 2653, P3: 640 },
      lessonLevelIllustrationFiles: 44,
      questionLevelDiagramCount: 0
    }
  };

  return {
    totalQuestions: rows.length,
    allTeachingIllustrationCandidateQuestions: rows.length,
    questionLevelDiagramCount,
    lessonLevelIllustrationFiles: lessonIllustrationFiles.length,
    byGrade: sortObject(byGrade),
    byType: sortObject(byType),
    byBatch: sortObject(byBatch),
    byTier: sortObject(byTier),
    byCategory: sortObject(byCategory),
    byTopic: sortObject(byTopic),
    templateSummary,
    validation
  };
}

function validate(rows, summary) {
  const checks = summary.validation.checks;
  checkEqual(checks, "CSV queue row count", rows.length, 4800);
  checkObject(checks, "Grade totals", summary.byGrade, { S4: 1600, S5: 1600, S6: 1600 });
  checkObject(checks, "Question type totals", summary.byType, {
    "multiple-choice": 1620,
    "fill-in": 1590,
    "short-answer": 1590
  });
  checkObject(checks, "Illustration priority totals", summary.byTier, { P1: 1507, P2: 2653, P3: 640 });
  checkEqual(checks, "Question-level diagram count", summary.questionLevelDiagramCount, 0);
  checkEqual(checks, "Lesson-level Mainland PEP high illustration files", summary.lessonLevelIllustrationFiles, 44);

  const passed = checks.every((check) => check.passed);
  summary.validation.passed = passed;

  if (!passed) {
    throw new Error(`Illustration audit validation failed: ${checks.filter((check) => !check.passed).map((check) => check.name).join(", ")}`);
  }
}

function checkEqual(checks, name, actual, expected) {
  checks.push({ name, actual, expected, passed: actual === expected });
}

function checkObject(checks, name, actual, expected) {
  const normalizedActual = sortObject(actual);
  const normalizedExpected = sortObject(expected);
  checks.push({
    name,
    actual: normalizedActual,
    expected: normalizedExpected,
    passed: JSON.stringify(normalizedActual) === JSON.stringify(normalizedExpected)
  });
}

function countBy(rows, key) {
  return rows.reduce((acc, row) => {
    acc[row[key]] = (acc[row[key]] ?? 0) + 1;
    return acc;
  }, {});
}

function sortObject(value) {
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
}

function sampleRowsByCategory(rows, sampleSize) {
  const grouped = new Map();
  for (const row of rows) {
    if (!grouped.has(row.illustrationCategory)) grouped.set(row.illustrationCategory, []);
    grouped.get(row.illustrationCategory).push(row);
  }

  return Object.fromEntries([...grouped.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "zh-Hans-CN"))
    .map(([category, categoryRows]) => [
      category,
      categoryRows.slice(0, sampleSize).map((row) => ({
        questionId: row.questionId,
        grade: row.grade,
        topicZh: row.topicZh,
        questionType: row.questionType,
        batch: row.batch,
        illustrationTier: row.illustrationTier,
        reusableTemplateKey: row.reusableTemplateKey,
        promptZh: row.promptZh
      }))
    ]));
}

function toCsv(rows) {
  const fields = [
    "questionId",
    "grade",
    "topicId",
    "topicZh",
    "questionType",
    "batch",
    "promptZh",
    "answer",
    "illustrationTier",
    "illustrationCategory",
    "reusableTemplateKey",
    "suggestedImageKind",
    "exactMathLabelsNeeded",
    "generationPriority",
    "notes"
  ];

  return [
    fields.join(","),
    ...rows.map((row) => fields.map((field) => csvEscape(row[field])).join(","))
  ].join("\n") + "\n";
}

function csvEscape(value) {
  const stringValue = String(value ?? "");
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replaceAll("\"", "\"\"")}"`;
  }
  return stringValue;
}

function toMarkdown(summary, manualReviewSamples) {
  return `# S18 Mainland PEP High Question Illustration Audit

- Date: ${reportDate}
- Generated at: ${generatedAtHkt} Asia/Hong_Kong
- Session: S18 Curriculum QA and content quality
- Source: \`data/mainlandPepHighQuestions.ts\`
- Scope: MAINLAND_PEP_HIGH S4-S6, all-teaching-illustration candidate queue

## Executive Summary

This audit counts every Mainland PEP high-school question as a teaching-illustration candidate under the owner's all-teaching-illustration scope. It does not call GPT Image2, does not edit product question data, and does not treat existing lesson illustrations as question-level diagrams.

- Total candidate questions: ${summary.totalQuestions.toLocaleString("en-US")}
- Current question-level diagrams: ${summary.questionLevelDiagramCount}
- Existing Mainland PEP high lesson-level illustration files: ${summary.lessonLevelIllustrationFiles}
- Unique reusable template keys: ${summary.templateSummary.totalUniqueTemplates}
- Production order: P1 -> P2 -> P3

## Priority Totals

${markdownTable(["Tier", "Meaning", "Question Count", "Unique Templates"], Object.entries(summary.byTier).map(([tier, count]) => [
    tier,
    tierLabels[tier],
    count,
    summary.templateSummary.byTier[tier] ?? 0
  ]))}

## Grade, Type, And Batch Checks

${markdownTable(["Dimension", "Breakdown"], [
    ["Grade", inlineObject(summary.byGrade)],
    ["Question type", inlineObject(summary.byType)],
    ["Generation batch", inlineObject(summary.byBatch)]
  ])}

## Topic Counts

${markdownTable(["Topic", "Tier", "Questions"], Object.entries(summary.byTopic).map(([key, count]) => {
    const [tier, topicId, topicZh] = key.split(" | ");
    return [`${topicZh} (${topicId})`, tier, count];
  }))}

## Category Counts

${markdownTable(["Illustration Category", "Questions", "Unique Templates"], Object.entries(summary.byCategory).map(([category, count]) => [
    category,
    count,
    summary.templateSummary.byCategory[category] ?? 0
  ]))}

## Validation

${markdownTable(["Check", "Expected", "Actual", "Status"], summary.validation.checks.map((check) => [
    check.name,
    typeof check.expected === "object" ? inlineObject(check.expected) : check.expected,
    typeof check.actual === "object" ? inlineObject(check.actual) : check.actual,
    check.passed ? "PASS" : "FAIL"
  ]))}

## Manual Review Sample Coverage

${markdownTable(["Illustration Category", "Sample Count", "Coverage Status"], Object.entries(manualReviewSamples).map(([category, samples]) => [
    category,
    samples.length,
    samples.length >= 5 ? "PASS - at least 5 samples listed below" : "FAIL - fewer than 5 samples"
  ]))}

## Manual Review Samples

Each category below includes 5 sample questions for S18 manual spot-checking before GPT Image2 production. These are classification samples, not image-generation prompts.

${Object.entries(manualReviewSamples).map(([category, samples]) => `### ${category}

${markdownTable(["Question ID", "Grade", "Type", "Batch", "Tier", "Prompt"], samples.map((sample) => [
    sample.questionId,
    sample.grade,
    sample.questionType,
    sample.batch,
    sample.illustrationTier,
    trimForTable(sample.promptZh, 110)
  ]))}`).join("\n\n")}

## Notes For GPT Image2 Planning

- Use the CSV queue for budgeting and scheduling; all 4,800 rows are candidates.
- Use \`generationPriority\` to process P1 first, then P2, then P3.
- Use \`reusableTemplateKey\` to group rows into ${summary.templateSummary.totalUniqueTemplates} topic-type visual templates before generating variants.
- Keep exact mathematical text, coordinates, labels, formulas, and answer-critical markings out of the image model when possible; add them with deterministic rendering or SVG/Canvas overlays later.
- Existing \`public/lesson-illustrations/mainland-pep-high/\` files are lesson-level illustrations and should not be counted as question-level diagrams.
`;
}

function markdownTable(headers, rows) {
  const escapedHeaders = headers.map(markdownCell);
  const escapedRows = rows.map((row) => row.map(markdownCell));
  return [
    `| ${escapedHeaders.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...escapedRows.map((row) => `| ${row.join(" | ")} |`)
  ].join("\n");
}

function markdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function inlineObject(value) {
  return Object.entries(value).map(([key, count]) => `${key}: ${count}`).join("; ");
}

function trimForTable(value, maxLength) {
  const normalized = String(value ?? "").replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 3)}...`;
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(fullPath);
    if (entry.isFile()) return [fullPath];
    return [];
  });
}

function formatHktDate(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}
