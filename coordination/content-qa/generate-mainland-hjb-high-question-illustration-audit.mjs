#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");

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

const artifactStem = `${reportDate}-S18-mainland-hjb-high-question-illustration`;
const csvPath = path.join(scriptDir, `${artifactStem}-queue.csv`);
const jsonPath = path.join(scriptDir, `${artifactStem}-queue.json`);
const mdPath = path.join(scriptDir, `${artifactStem}-audit.md`);

const questionPacks = [
  {
    batch: "hjb-v1",
    path: path.join(scriptDir, "mainland-hjb-high-generated-bank-v1/question-pack.json")
  },
  {
    batch: "hjb-v2",
    path: path.join(scriptDir, "mainland-hjb-high-generated-bank-v2/question-pack.json")
  },
  {
    batch: "hjb-v3-remediated",
    path: path.join(scriptDir, "mainland-hjb-high-generated-bank-v3-remediated/question-pack.json")
  },
  {
    batch: "hjb-v4-remediated",
    path: path.join(scriptDir, "mainland-hjb-high-generated-bank-v4-remediated/question-pack.json")
  }
];

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

const tierOrder = new Map([
  ["P1", 1],
  ["P2", 2],
  ["P3", 3]
]);

const batchOrder = new Map([
  ["hjb-v1", 1],
  ["hjb-v2", 2],
  ["hjb-v3-remediated", 3],
  ["hjb-v4-remediated", 4]
]);

const explicitDiagramPattern = /如图|图中|下图|示意图|图像|图象|散点图|树状图|坐标系/u;
const strongDiagramPattern =
  /长方体|几何体|同一顶点|互相垂直|直线\s*[A-Za-z]?\s*经过点|斜率|椭圆|双曲线|抛物线|三角形|△|∠|边\s*AB|边\s*AC|BC²|扇形|圆心角|弧度|圆形|半径/u;
const teachingAidPattern =
  /sin|cos|tan|最大值|最小值|周期|导数|袋中|随机|事件\s*A|事件\s*B|分步计数|不同元素|无序组合|安排|选法|一组数据|平均数|定义域|值域|单调|偶函数|奇函数/u;

const categoryConfigs = [
  {
    category: "函数图像/题干显式坐标图",
    tier: "P1",
    templateStem: "explicit-function-coordinate-graph",
    suggestedImageKind: "coordinate-plane graph or explicit visual prompt diagram",
    exactMathLabelsNeeded: "yes: axes, points, function labels, and answer-critical values should be deterministic overlays",
    notes: "题干已出现图像/图象/坐标系等视觉信号；GPT Image2 should create only the clean base visual, not exact labels.",
    matches: (question) => explicitDiagramPattern.test(question.promptZhHans)
  },
  {
    category: "立体几何长方体/线面关系图",
    tier: "P1",
    templateStem: "solid-geometry-cuboid-line-plane",
    suggestedImageKind: "3D wireframe solid geometry diagram",
    exactMathLabelsNeeded: "yes: vertex labels, edge lengths, right-angle cues, plane names, and formulas should be deterministic overlays",
    notes: "优先使用透明长方体、线面关系、辅助线和垂直/平行提示，避免直接生成答案文字。",
    matches: (question) => /长方体|几何体|同一顶点|互相垂直/u.test(question.promptZhHans)
  },
  {
    category: "圆锥曲线坐标图",
    tier: "P1",
    templateStem: "conic-coordinate-diagram",
    suggestedImageKind: "coordinate-plane conic section diagram",
    exactMathLabelsNeeded: "yes: axes, vertices, foci, directrix, equations, and numeric labels should be deterministic overlays",
    notes: "圆锥曲线是高精度类别；GPT Image2 should provide visual structure only, with exact math overlaid later.",
    matches: (question) => /椭圆|双曲线|抛物线|圆锥曲线/u.test(question.promptZhHans) || question.chapter === "圆锥曲线"
  },
  {
    category: "解析几何直线坐标图",
    tier: "P1",
    templateStem: "analytic-line-coordinate-plane",
    suggestedImageKind: "coordinate-plane line diagram",
    exactMathLabelsNeeded: "yes: coordinates, slope, line names, equations, and intercept labels should be deterministic overlays",
    notes: "用干净坐标轴、点、直线和斜率提示作底图；精确坐标和方程留给 deterministic overlay.",
    matches: (question) =>
      /直线\s*[A-Za-z]?\s*经过点|斜率|平面直角坐标系中的直线/u.test(question.promptZhHans) ||
      question.chapter === "平面直角坐标系中的直线"
  },
  {
    category: "平面/三角几何图",
    tier: "P1",
    templateStem: "plane-triangle-angle-diagram",
    suggestedImageKind: "triangle, angle, and plane-geometry diagram",
    exactMathLabelsNeeded: "yes: point names, side lengths, angles, area cues, and vector labels should be deterministic overlays",
    notes: "三角形、角、边长和面积题适合作为 P1；图像模型只做几何构型，标签后加。",
    matches: (question) => /三角形|△|∠|边\s*AB|边\s*AC|BC²|扇形|圆心角|弧度|圆形|半径/u.test(question.promptZhHans)
  },
  {
    category: "导数曲线/切线图",
    tier: "P2",
    templateStem: "derivative-curve-tangent",
    suggestedImageKind: "function curve with tangent, slope, and sign cues",
    exactMathLabelsNeeded: "yes: expressions, tangent points, derivative values, interval labels, and extrema should be deterministic overlays",
    notes: "适合生成曲线、切线和单调性直觉；不要让图像模型直接写公式或精确答案。",
    matches: (question) => /导数/u.test(question.promptZhHans) || /导数/u.test(question.chapter)
  },
  {
    category: "三角函数单位圆/波形图",
    tier: "P2",
    templateStem: "trig-unit-circle-wave",
    suggestedImageKind: "unit-circle and trigonometric wave diagram",
    exactMathLabelsNeeded: "yes: angle values, signs, periods, amplitude, phase, and key labels should be deterministic overlays",
    notes: "用于周期、最值、符号和图像直觉；具体角度和表达式后续覆盖。",
    matches: (question) => /sin|cos|tan|周期/u.test(question.promptZhHans) || question.chapter === "三角函数"
  },
  {
    category: "概率样本空间/摸球图",
    tier: "P2",
    templateStem: "probability-sample-space-bag",
    suggestedImageKind: "sample-space, event-region, bag-drawing, or tree diagram",
    exactMathLabelsNeeded: "yes: counts, event names, branch labels, and probability fractions should be deterministic overlays",
    notes: "适合摸球、事件分解、样本空间和概率树底图；具体数字由覆盖层处理。",
    matches: (question) => /袋中|随机|事件\s*A|事件\s*B|概率/u.test(question.promptZhHans) || /概率/u.test(question.chapter)
  },
  {
    category: "统计数据图表",
    tier: "P2",
    templateStem: "statistics-chart-distribution",
    suggestedImageKind: "bar chart, histogram, distribution, or scatter-style data diagram",
    exactMathLabelsNeeded: "yes: data values, axes, means, spread labels, and regression/statistical annotations should be deterministic overlays",
    notes: "图像模型只生成清爽图表结构；具体数据、均值和结论用确定性渲染。",
    matches: (question) => /一组数据|平均数|统计/u.test(question.promptZhHans) || /统计|成对数据/u.test(question.chapter)
  },
  {
    category: "计数原理分支/槽位图",
    tier: "P2",
    templateStem: "counting-branches-slots",
    suggestedImageKind: "branching tree or arrangement-slot diagram",
    exactMathLabelsNeeded: "yes: item counts, branch names, slot labels, and formulas should be deterministic overlays",
    notes: "适合排列组合、分步计数和选法结构；数字和公式后续覆盖。",
    matches: (question) => /分步计数|不同元素|无序组合|安排|选法/u.test(question.promptZhHans) || /计数/u.test(question.chapter)
  },
  {
    category: "函数/不等式教学辅助图",
    tier: "P2",
    templateStem: "function-inequality-teaching-aid",
    suggestedImageKind: "function curve, number-line, sign-chart, or interval diagram",
    exactMathLabelsNeeded: "yes: endpoints, intervals, exact expressions, and inequality signs should be deterministic overlays",
    notes: "用于定义域、值域、单调、奇偶、最值或不等式直觉；不把精确公式交给图片模型。",
    matches: (question) => /最大值|最小值|定义域|值域|单调|偶函数|奇函数/u.test(question.promptZhHans)
  }
];

const p3Config = {
  category: "暂不生成/低优先纯符号题",
  tier: "P3",
  templateStem: "no-question-level-image-holdout",
  suggestedImageKind: "no question-level image recommended for first GPT Image2 pass",
  exactMathLabelsNeeded: "no: hold out unless owner chooses full visual coverage",
  notes: "纯代数、简单代入、集合计数、复数实部、等差数列代入等题先保留为统计低优先。"
};

const sourceQuestions = readQuestions();
const chapterOrder = new Map();
sourceQuestions.forEach((question) => {
  if (!chapterOrder.has(question.chapter)) chapterOrder.set(question.chapter, chapterOrder.size + 1);
});

const questionLevelDiagramCount = sourceQuestions.filter(hasQuestionLevelDiagramMarker).length;
const lessonLevelIllustrationFiles = countFiles(path.join(rootDir, "public/lesson-illustrations/mainland-hjb-high"), [
  ".png",
  ".jpg",
  ".jpeg",
  ".webp"
]);

const queue = sourceQuestions.map((question) => toQueueRow(question)).sort(sortQueueRows);
const summary = buildSummary(queue);
const manualReviewSamples = buildManualReviewSamples(queue);
const validation = validate({ queue, summary, manualReviewSamples, questionLevelDiagramCount, lessonLevelIllustrationFiles });

const output = {
  reportDate,
  generatedAtHkt,
  source: {
    productAdapter: "data/mainlandHjbHighQuestions.ts",
    questionPacks: questionPacks.map((pack) => path.relative(rootDir, pack.path)),
    scope: "MAINLAND_HJB high school S4-S6 question illustration-needs statistics",
    imageGeneration: "not-run"
  },
  assumptions: [
    "Owner selected wide-scope counting: P1 + P2 rows are GPT Image2 candidates; P3 remains a low-priority/statistical holdout.",
    "This audit does not call GPT Image2, does not generate images, and does not edit product question-bank/UI files.",
    "Existing lesson-level HJB high illustrations are counted as background assets, not as question-level diagrams.",
    "Exact formulas, coordinates, point names, angle values, and answers should be rendered deterministically after image generation."
  ],
  validation,
  summary,
  manualReviewSamples,
  queue
};

fs.writeFileSync(jsonPath, `${JSON.stringify(output, null, 2)}\n`);
fs.writeFileSync(csvPath, buildCsv(queue));
fs.writeFileSync(mdPath, buildMarkdown({ summary, validation, manualReviewSamples }));

if (!validation.passed) {
  console.error(JSON.stringify(validation, null, 2));
  process.exit(1);
}

console.log(`Wrote ${path.relative(rootDir, mdPath)}`);
console.log(`Wrote ${path.relative(rootDir, csvPath)}`);
console.log(`Wrote ${path.relative(rootDir, jsonPath)}`);
console.log(`Wide-scope GPT Image2 candidate rows: ${summary.wideScopeCandidateQuestions}`);

function readQuestions() {
  return questionPacks.flatMap((pack) => {
    const parsed = JSON.parse(fs.readFileSync(pack.path, "utf8"));
    if (!Array.isArray(parsed.questions)) throw new Error(`Missing questions array in ${pack.path}`);

    return parsed.questions.map((question) => ({
      ...question,
      batch: pack.batch
    }));
  });
}

function toQueueRow(question) {
  const config = classifyQuestion(question);
  const wideScopeCandidate = config.tier === "P1" || config.tier === "P2";

  return {
    questionId: question.id,
    grade: question.grade,
    volume: question.volume,
    chapter: question.chapter,
    topicId: question.topicId,
    topicZh: question.topicTitleZhHans,
    questionType: question.type,
    difficulty: question.difficulty,
    batch: question.batch,
    promptZh: question.promptZhHans,
    answer: question.answer,
    illustrationTier: config.tier,
    wideScopeCandidate: wideScopeCandidate ? "yes" : "no",
    illustrationCategory: config.category,
    reusableTemplateKey: `${config.tier}:${config.templateStem}:${question.type}`,
    suggestedImageKind: config.suggestedImageKind,
    exactMathLabelsNeeded: config.exactMathLabelsNeeded,
    generationPriority: generationPriority(config.tier),
    gptImage2Notes: config.notes,
    sourceDistanceStatus: question.sourceDistanceStatus,
    mathQaStatus: question.mathQaStatus,
    terminologyQaStatus: question.terminologyQaStatus,
    topicOrder: chapterOrder.get(question.chapter) ?? 999
  };
}

function classifyQuestion(question) {
  const firstMatch = categoryConfigs.find((config) => config.matches(question));
  if (firstMatch) return firstMatch;

  if (strongDiagramPattern.test(question.promptZhHans)) {
    return categoryConfigs.find((config) => config.tier === "P1") ?? p3Config;
  }

  if (teachingAidPattern.test(question.promptZhHans)) {
    return categoryConfigs.find((config) => config.category === "函数/不等式教学辅助图") ?? p3Config;
  }

  return p3Config;
}

function generationPriority(tier) {
  if (tier === "P1") return "1_high";
  if (tier === "P2") return "2_medium";
  return "3_low_holdout";
}

function buildSummary(rows) {
  const wideRows = rows.filter((row) => row.wideScopeCandidate === "yes");
  const uniqueTemplates = new Set(rows.map((row) => row.reusableTemplateKey));
  const wideUniqueTemplates = new Set(wideRows.map((row) => row.reusableTemplateKey));

  return {
    totalQuestions: rows.length,
    wideScopeCandidateQuestions: wideRows.length,
    lowPriorityHoldoutQuestions: rows.length - wideRows.length,
    questionLevelDiagramCount,
    lessonLevelIllustrationFiles,
    byGrade: countBy(rows, (row) => row.grade, gradeOrder),
    wideScopeByGrade: countBy(wideRows, (row) => row.grade, gradeOrder),
    byType: countBy(rows, (row) => row.questionType, typeOrder),
    byBatch: countBy(rows, (row) => row.batch, batchOrder),
    byTier: countBy(rows, (row) => row.illustrationTier, tierOrder),
    wideScopeByType: countBy(wideRows, (row) => row.questionType, typeOrder),
    byCategory: countBy(rows, (row) => row.illustrationCategory),
    wideScopeByCategory: countBy(wideRows, (row) => row.illustrationCategory),
    byChapterTier: countBy(rows, (row) => `${row.illustrationTier} | ${row.grade} | ${row.chapter}`),
    wideScopeByChapter: countBy(wideRows, (row) => `${row.grade} | ${row.chapter}`),
    templateSummary: {
      totalUniqueTemplates: uniqueTemplates.size,
      wideScopeUniqueTemplates: wideUniqueTemplates.size,
      byTier: countBy(rows, (row) => row.illustrationTier, tierOrder),
      wideScopeByCategory: Object.fromEntries(
        Object.entries(groupBy(wideRows, (row) => row.illustrationCategory)).map(([category, categoryRows]) => [
          category,
          new Set(categoryRows.map((row) => row.reusableTemplateKey)).size
        ])
      )
    }
  };
}

function buildManualReviewSamples(rows) {
  return Object.entries(groupBy(rows, (row) => row.illustrationCategory))
    .map(([category, categoryRows]) => ({
      category,
      tier: categoryRows[0]?.illustrationTier ?? "unknown",
      sampleCount: Math.min(5, categoryRows.length),
      totalRows: categoryRows.length,
      samples: categoryRows.slice(0, 5).map((row) => ({
        questionId: row.questionId,
        grade: row.grade,
        chapter: row.chapter,
        questionType: row.questionType,
        promptZh: row.promptZh,
        reusableTemplateKey: row.reusableTemplateKey,
        gptImage2Notes: row.gptImage2Notes
      }))
    }))
    .sort((a, b) => (tierOrder.get(a.tier) ?? 99) - (tierOrder.get(b.tier) ?? 99) || a.category.localeCompare(b.category, "zh-Hans"));
}

function validate({ queue: rows, summary: data, manualReviewSamples: samples, questionLevelDiagramCount, lessonLevelIllustrationFiles }) {
  const idSet = new Set(rows.map((row) => row.questionId));
  const tierTotal = Object.values(data.byTier).reduce((sum, count) => sum + count, 0);
  const wideScopeByTier =
    (data.byTier.P1 ?? 0) +
    (data.byTier.P2 ?? 0);
  const sampleCoveragePassed = samples
    .filter((sample) => sample.tier === "P1" || sample.tier === "P2")
    .every((sample) => sample.sampleCount >= 5);

  const checks = [
    check("Total HJB high question rows", rows.length, 6000),
    check("Unique question IDs", idSet.size, rows.length),
    check("Grade totals", data.byGrade, { S4: 2000, S5: 2000, S6: 2000 }),
    check("Priority totals sum to all rows", tierTotal, rows.length),
    check("Wide-scope candidate count equals P1 + P2", data.wideScopeCandidateQuestions, wideScopeByTier),
    check("Question-level diagram count", questionLevelDiagramCount, 0),
    check("Lesson-level Mainland HJB high illustration files", lessonLevelIllustrationFiles, 60),
    {
      name: "P1/P2 category sample coverage",
      actual: sampleCoveragePassed ? ">=5 samples per P1/P2 category" : "missing category sample coverage",
      expected: ">=5 samples per P1/P2 category",
      passed: sampleCoveragePassed
    }
  ];

  return {
    passed: checks.every((item) => item.passed),
    checks,
    expected: {
      totalRows: 6000,
      byGrade: { S4: 2000, S5: 2000, S6: 2000 },
      questionLevelDiagramCount: 0,
      lessonLevelIllustrationFiles: 60,
      wideScopeCandidateDefinition: "P1 + P2"
    }
  };
}

function check(name, actual, expected) {
  return {
    name,
    actual,
    expected,
    passed: JSON.stringify(actual) === JSON.stringify(expected)
  };
}

function buildCsv(rows) {
  const headers = [
    "questionId",
    "grade",
    "volume",
    "chapter",
    "topicId",
    "topicZh",
    "questionType",
    "difficulty",
    "batch",
    "promptZh",
    "answer",
    "illustrationTier",
    "wideScopeCandidate",
    "illustrationCategory",
    "reusableTemplateKey",
    "suggestedImageKind",
    "exactMathLabelsNeeded",
    "generationPriority",
    "gptImage2Notes",
    "sourceDistanceStatus",
    "mathQaStatus",
    "terminologyQaStatus",
    "topicOrder"
  ];

  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))
  ].join("\n") + "\n";
}

function buildMarkdown({ summary: data, validation, manualReviewSamples: samples }) {
  const validationRows = validation.checks.map((item) => [
    item.name,
    formatValue(item.expected),
    formatValue(item.actual),
    item.passed ? "PASS" : "FAIL"
  ]);

  const categoryRows = Object.entries(data.byCategory).map(([category, count]) => [
    category,
    count,
    data.wideScopeByCategory[category] ?? 0,
    category === p3Config.category ? "P3" : samples.find((sample) => sample.category === category)?.tier ?? ""
  ]);

  const chapterRows = Object.entries(data.byChapterTier).map(([chapterTier, count]) => [chapterTier, count]);

  const sampleCoverageRows = samples.map((sample) => [
    sample.category,
    sample.tier,
    sample.totalRows,
    sample.sampleCount,
    sample.tier === "P3" || sample.sampleCount >= 5 ? "PASS" : "FAIL"
  ]);

  const sampleSections = samples
    .filter((sample) => sample.tier === "P1" || sample.tier === "P2")
    .map((sample) => [
      `### ${sample.category}`,
      "",
      mdTable(
        ["Question ID", "Grade", "Chapter", "Type", "Prompt", "Template"],
        sample.samples.map((row) => [
          row.questionId,
          row.grade,
          row.chapter,
          row.questionType,
          row.promptZh,
          row.reusableTemplateKey
        ])
      )
    ].join("\n"))
    .join("\n\n");

  return [
    "# S18 Mainland HJB High Question Illustration Audit",
    "",
    `- Date: ${reportDate}`,
    `- Generated at: ${generatedAtHkt} Asia/Hong_Kong`,
    "- Session: S18 Curriculum QA and content quality",
    "- Source: `data/mainlandHjbHighQuestions.ts` via approved HJB high question-pack JSON",
    "- Scope: MAINLAND_HJB S4-S6, wide-scope GPT Image2 preparation queue",
    "",
    "## Executive Summary",
    "",
    "This audit counts Mainland HJB high-school questions that should enter a later GPT Image2 planning queue under the owner-confirmed wide-scope standard. It does not call GPT Image2, does not generate images, and does not edit product question data.",
    "",
    `- Total HJB high questions: ${data.totalQuestions}`,
    `- GPT Image2 candidate questions (P1 + P2): ${data.wideScopeCandidateQuestions}`,
    `- Low-priority holdout questions (P3): ${data.lowPriorityHoldoutQuestions}`,
    `- Current question-level diagrams: ${data.questionLevelDiagramCount}`,
    `- Existing HJB high lesson-level illustration files: ${data.lessonLevelIllustrationFiles}`,
    `- Unique reusable template keys: ${data.templateSummary.totalUniqueTemplates}`,
    `- Wide-scope reusable template keys: ${data.templateSummary.wideScopeUniqueTemplates}`,
    "- Production order: P1 -> P2 -> P3",
    "",
    "## Priority Totals",
    "",
    mdTable(
      ["Tier", "Meaning", "Question Count"],
      [
        ["P1", "Question-level diagram required or strongly recommended", data.byTier.P1 ?? 0],
        ["P2", "Wide-scope teaching illustration support", data.byTier.P2 ?? 0],
        ["P3", "Low-priority holdout / no first-pass image", data.byTier.P3 ?? 0]
      ]
    ),
    "",
    "## Grade, Type, And Batch Checks",
    "",
    mdTable(
      ["Dimension", "Breakdown"],
      [
        ["Grade", formatBreakdown(data.byGrade)],
        ["Wide-scope grade", formatBreakdown(data.wideScopeByGrade)],
        ["Question type", formatBreakdown(data.byType)],
        ["Wide-scope type", formatBreakdown(data.wideScopeByType)],
        ["Generation batch", formatBreakdown(data.byBatch)]
      ]
    ),
    "",
    "## Category Counts",
    "",
    mdTable(["Illustration Category", "All Questions", "P1/P2 Candidate Questions", "Tier"], categoryRows),
    "",
    "## Chapter And Tier Counts",
    "",
    mdTable(["Tier | Grade | Chapter", "Questions"], chapterRows),
    "",
    "## Validation",
    "",
    mdTable(["Check", "Expected", "Actual", "Status"], validationRows),
    "",
    "## Manual Review Sample Coverage",
    "",
    mdTable(["Category", "Tier", "Rows", "Samples", "Status"], sampleCoverageRows),
    "",
    "## P1/P2 Manual Review Samples",
    "",
    sampleSections,
    "",
    "## GPT Image2 Production Notes",
    "",
    "- Start with P1, grouped by `reusableTemplateKey`, to produce reusable base visuals before any question-specific overlays.",
    "- Keep formulas, coordinates, labels, point names, angle values, and answers outside GPT Image2 generation whenever they are answer-critical.",
    "- Treat P3 as a budget holdout unless the owner later requests full visual coverage for pure-symbolic questions.",
    ""
  ].join("\n");
}

function countBy(values, keyFn, orderMap) {
  const counts = new Map();
  values.forEach((value) => {
    const key = keyFn(value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });

  return Object.fromEntries(
    Array.from(counts.entries()).sort((a, b) => {
      const orderA = orderMap?.get(a[0]) ?? 999;
      const orderB = orderMap?.get(b[0]) ?? 999;
      return orderA - orderB || String(a[0]).localeCompare(String(b[0]), "zh-Hans");
    })
  );
}

function groupBy(values, keyFn) {
  return values.reduce((groups, value) => {
    const key = keyFn(value);
    const bucket = groups[key] ?? [];
    bucket.push(value);
    groups[key] = bucket;
    return groups;
  }, {});
}

function sortQueueRows(left, right) {
  return (
    (gradeOrder.get(left.grade) ?? 999) - (gradeOrder.get(right.grade) ?? 999) ||
    (tierOrder.get(left.illustrationTier) ?? 999) - (tierOrder.get(right.illustrationTier) ?? 999) ||
    left.topicOrder - right.topicOrder ||
    left.illustrationCategory.localeCompare(right.illustrationCategory, "zh-Hans") ||
    (typeOrder.get(left.questionType) ?? 999) - (typeOrder.get(right.questionType) ?? 999) ||
    (batchOrder.get(left.batch) ?? 999) - (batchOrder.get(right.batch) ?? 999) ||
    left.questionId.localeCompare(right.questionId)
  );
}

function hasQuestionLevelDiagramMarker(question) {
  return Boolean(question.diagram || question.image || question.imageSrc || question.illustration || question.questionImage);
}

function countFiles(dir, extensions) {
  if (!fs.existsSync(dir)) return 0;

  return fs.readdirSync(dir, { withFileTypes: true }).reduce((count, entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return count + countFiles(fullPath, extensions);
    return extensions.includes(path.extname(entry.name).toLowerCase()) ? count + 1 : count;
  }, 0);
}

function csvCell(value) {
  const text = String(value ?? "").replace(/\s*\r?\n\s*/gu, " ");
  if (/[",\n\r]/u.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function mdTable(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map((cell) => escapeMarkdownTableCell(formatValue(cell))).join(" | ")} |`)
  ].join("\n");
}

function escapeMarkdownTableCell(value) {
  return String(value).replaceAll("|", "\\|").replace(/\s+/gu, " ").trim();
}

function formatBreakdown(value) {
  return Object.entries(value)
    .map(([key, count]) => `${key}: ${count}`)
    .join("; ");
}

function formatValue(value) {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value === null || value === undefined) return "";
  return formatBreakdown(value);
}

function formatHktDate(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}
