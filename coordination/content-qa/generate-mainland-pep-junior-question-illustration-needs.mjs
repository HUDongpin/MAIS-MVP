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

const sourcePath = path.join(
  rootDir,
  "coordination/content-qa/mainland-pep-junior-generated-bank-v2-1200/question-pack.json"
);
const artifactStem = `${reportDate}-S18-mainland-pep-junior-question-illustration-needs`;
const mdPath = path.join(scriptDir, `${artifactStem}.md`);
const questionCsvPath = path.join(scriptDir, `${artifactStem}-questions.csv`);
const templateCsvPath = path.join(scriptDir, `${artifactStem}-template-families.csv`);
const categoryIdsCsvPath = path.join(scriptDir, `${artifactStem}-category-question-ids.csv`);
const jsonPath = path.join(scriptDir, `${artifactStem}.json`);

const categoryOrder = [
  "explicit_graph_or_figure",
  "coordinate_function",
  "number_line",
  "plane_geometry",
  "statistics_probability",
  "text_only"
];

const coreCategories = new Set([
  "explicit_graph_or_figure",
  "coordinate_function",
  "number_line",
  "plane_geometry"
]);
const broadCategories = new Set([...coreCategories, "statistics_probability"]);

const categoryConfigs = {
  explicit_graph_or_figure: {
    labelZh: "显式图形/图象题",
    definition: "题干或选项直接出现图形、图象、网格、统计图、阴影、展开图等图示信号。",
    phase: "core",
    gptImage2Batch: "batch-1-core-coordinate-function",
    productionOrder: 2,
    suggestedImageKind: "coordinate, graph, or explicit figure base diagram",
    exactMathLabelsNeeded: "yes: axes, point labels, graph labels, values, and answer-critical marks should be deterministic overlays",
    notes: "Treat explicit graph references as first-batch core items, grouped with coordinate/function assets."
  },
  coordinate_function: {
    labelZh: "坐标与函数图象",
    definition: "坐标、象限、一次函数、二次函数、反比例函数、抛物线、顶点、对称轴等。",
    phase: "core",
    gptImage2Batch: "batch-1-core-coordinate-function",
    productionOrder: 2,
    suggestedImageKind: "coordinate plane or function graph diagram",
    exactMathLabelsNeeded: "yes: axes, coordinates, formulas, intercepts, slopes, and vertex labels should be deterministic overlays",
    notes: "Use GPT Image2 for clean graph compositions; render exact formulas and coordinates outside the image model."
  },
  number_line: {
    labelZh: "数轴",
    definition: "数轴、相反数、绝对值等需要或适合一维位置图的题。",
    phase: "core",
    gptImage2Batch: "batch-1-core-number-line",
    productionOrder: 3,
    suggestedImageKind: "number line with points and distance brackets",
    exactMathLabelsNeeded: "yes: tick labels, point labels, direction arrows, and distance brackets should be deterministic overlays",
    notes: "Use reusable number-line bases and overlay exact numeric values after generation."
  },
  plane_geometry: {
    labelZh: "平面几何与三角函数",
    definition: "角、平行线、三角形、全等、勾股、四边形、圆、相似、锐角三角函数等。",
    phase: "core",
    gptImage2Batch: "batch-1-core-plane-geometry",
    productionOrder: 1,
    suggestedImageKind: "plane geometry construction diagram",
    exactMathLabelsNeeded: "yes: vertex labels, angle marks, side lengths, arcs, and congruence/similarity marks should be deterministic overlays",
    notes: "Prioritize this category first because geometry and trigonometry diagrams carry the highest instructional value."
  },
  statistics_probability: {
    labelZh: "统计与概率可视化",
    definition: "统计、数据、平均数、中位数、方差、概率、随机、表格、列表、树状图等。",
    phase: "optional-second-batch",
    gptImage2Batch: "batch-2-optional-statistics-probability",
    productionOrder: 4,
    suggestedImageKind: "data table, chart, sample-space, or probability model diagram",
    exactMathLabelsNeeded: "yes: data values, axes, event names, counts, and probability fractions should be deterministic overlays",
    notes: "Default to second batch; many rows are answerable as text but benefit from structured visual aids."
  },
  text_only: {
    labelZh: "纯文字/代数题",
    definition: "未触发插图需求规则的代数、方程、运算或文字题。",
    phase: "not-needed",
    gptImage2Batch: "not-planned",
    productionOrder: 9,
    suggestedImageKind: "none",
    exactMathLabelsNeeded: "not applicable",
    notes: "Do not send to GPT Image2 unless a later pedagogy review chooses optional teaching art."
  }
};

const classificationRules = [
  {
    category: "explicit_graph_or_figure",
    pattern: /(如图|下图|图中|图示|示意图|网格|方格纸|统计图|条形图|折线图|扇形图|概率树|阴影|展开图|图形|图象|图像)/
  },
  {
    category: "number_line",
    pattern: /(数轴|相反数|绝对值)/
  },
  {
    category: "coordinate_function",
    pattern: /(坐标|象限|平面直角坐标系|点[A-Z]?\(|一次函数|二次函数|反比例函数|函数\s*y=|^\s*y=|抛物线|顶点|对称轴|x轴|y轴)/
  },
  {
    category: "plane_geometry",
    pattern: /(线段|直线|射线|角|平角|补角|余角|平行|垂直|相交|三角形|全等|轴对称|勾股|四边形|平行四边形|矩形|菱形|正方形|梯形|圆|圆心|半径|直径|弦|弧|圆周角|相似|锐角三角函数|坡度|仰角|俯角|sin|cos|tan|面积|周长)/
  },
  {
    category: "statistics_probability",
    pattern: /(统计|数据|频数|频率|平均数|中位数|众数|方差|样本|概率|随机|表格|列表|树状图)/
  }
];

const gradeOrder = new Map([
  ["S1", 1],
  ["S2", 2],
  ["S3", 3]
]);

const typeOrder = new Map([
  ["multiple-choice", 1],
  ["fill-in", 2],
  ["short-answer", 3],
  ["graph", 4]
]);

const difficultyOrder = new Map([
  ["Foundation", 1],
  ["Core", 2],
  ["Exam", 3],
  ["Challenge", 4]
]);

run();

function run() {
  const questions = readQuestions();
  const rows = questions.map(rowForQuestion);
  const templates = buildTemplateFamilies(rows);
  attachTemplateIds(rows, templates);
  rows.sort(compareQuestionRows);
  templates.sort(compareTemplateRows);

  const summary = summarize(rows, templates);
  validate(summary);

  const categoryIdRows = buildCategoryIdRows(rows);
  const manualReviewSamples = sampleRowsByCategory(rows, 10);
  const jsonPayload = {
    reportDate,
    generatedAtHkt,
    source: {
      questionPack: path.relative(rootDir, sourcePath),
      scope: "Mainland PEP junior S1-S3 question pack, v2 1200",
      classificationInput: "promptZhHans plus optionsZhHans only"
    },
    assumptions: [
      "Core illustration needs include explicit figures, coordinate/function graphs, number lines, and plane geometry.",
      "Statistics/probability rows are counted as optional second-batch visual aids.",
      "GPT Image2 is not called in this audit.",
      "Exact mathematical labels, coordinates, formulas, and answer-defining marks should be rendered deterministically after image generation."
    ],
    validation: summary.validation,
    summary,
    manualReviewSamples,
    templateFamilies: templates.map(templateCsvRow),
    categoryQuestionIds: categoryIdRows,
    questions: rows.map(questionCsvRow)
  };

  fs.writeFileSync(questionCsvPath, toCsv(rows.map(questionCsvRow)), "utf8");
  fs.writeFileSync(templateCsvPath, toCsv(templates.map(templateCsvRow)), "utf8");
  fs.writeFileSync(categoryIdsCsvPath, toCsv(categoryIdRows), "utf8");
  fs.writeFileSync(jsonPath, `${JSON.stringify(jsonPayload, null, 2)}\n`, "utf8");
  fs.writeFileSync(mdPath, toMarkdown(summary, templates, categoryIdRows, manualReviewSamples), "utf8");

  console.log(JSON.stringify({
    report: path.relative(rootDir, mdPath),
    questionCsv: path.relative(rootDir, questionCsvPath),
    templateCsv: path.relative(rootDir, templateCsvPath),
    categoryIdsCsv: path.relative(rootDir, categoryIdsCsvPath),
    json: path.relative(rootDir, jsonPath),
    totalQuestions: summary.totalQuestions,
    coreQuestions: summary.coreQuestions,
    broadQuestions: summary.broadQuestions,
    coreTemplateFamilies: summary.coreTemplateFamilies,
    broadTemplateFamilies: summary.broadTemplateFamilies,
    byCategory: summary.byCategory
  }, null, 2));
}

function readQuestions() {
  const parsed = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  if (!Array.isArray(parsed.questions)) {
    throw new Error(`Expected questions array in ${sourcePath}`);
  }
  return parsed.questions;
}

function rowForQuestion(question) {
  const category = classifyQuestion(question);
  const config = categoryConfigs[category];
  const normalizedPromptTemplate = normalizePromptTemplate(question.promptZhHans);

  return {
    questionId: question.id,
    grade: question.grade,
    semester: question.semester,
    topicId: question.knowledgePointId,
    unitTitle: question.unitTitle,
    questionType: question.type,
    difficulty: question.difficulty,
    promptZhHans: question.promptZhHans,
    answer: question.answer,
    illustrationCategory: category,
    categoryLabelZh: config.labelZh,
    illustrationPhase: config.phase,
    gptImage2Batch: config.gptImage2Batch,
    productionOrder: config.productionOrder,
    normalizedPromptTemplate,
    templateKey: [
      category,
      question.knowledgePointId,
      question.type,
      normalizedPromptTemplate
    ].join(" | "),
    suggestedImageKind: config.suggestedImageKind,
    exactMathLabelsNeeded: config.exactMathLabelsNeeded,
    notes: config.notes
  };
}

function classifyQuestion(question) {
  const text = [question.promptZhHans, ...(question.optionsZhHans ?? [])].join(" ");
  const match = classificationRules.find((rule) => rule.pattern.test(text));
  return match?.category ?? "text_only";
}

function normalizePromptTemplate(prompt) {
  return String(prompt ?? "")
    .replace(/-?\d+(?:\.\d+)?/g, "#")
    .replace(/[A-Z]/g, "P")
    .replace(/[甲乙丙丁]/g, "X")
    .replace(/[一二三四五六七八九十]+(?=次|个|边|角|年级|班|组|项|件|本|人|元|米|厘米|千米|分钟|小时|天)/g, "N")
    .replace(/\s+/g, " ")
    .trim();
}

function buildTemplateFamilies(rows) {
  const grouped = new Map();

  for (const row of rows) {
    if (!grouped.has(row.templateKey)) grouped.set(row.templateKey, []);
    grouped.get(row.templateKey).push(row);
  }

  return [...grouped.entries()].map(([templateKey, templateRows]) => {
    templateRows.sort(compareQuestionRows);
    const representative = templateRows[0];
    const refined = refineTemplateRecommendation(representative);

    return {
      templateKey,
      templateFamilyId: "",
      illustrationCategory: representative.illustrationCategory,
      categoryLabelZh: representative.categoryLabelZh,
      illustrationPhase: representative.illustrationPhase,
      gptImage2Batch: representative.gptImage2Batch,
      productionOrder: representative.productionOrder,
      topicId: representative.topicId,
      unitTitle: representative.unitTitle,
      questionType: representative.questionType,
      normalizedPromptTemplate: representative.normalizedPromptTemplate,
      questionCount: templateRows.length,
      gradeBreakdown: inlineObject(sortObject(countBy(templateRows, "grade"))),
      difficultyBreakdown: inlineObject(sortObject(countBy(templateRows, "difficulty"))),
      representativeQuestionId: representative.questionId,
      representativePromptZhHans: representative.promptZhHans,
      suggestedImageKind: refined.suggestedImageKind,
      exactMathLabelsNeeded: refined.exactMathLabelsNeeded,
      notes: refined.notes,
      questionIds: templateRows.map((row) => row.questionId).join(" ")
    };
  });
}

function attachTemplateIds(rows, templates) {
  templates.sort(compareTemplateRowsWithoutId);
  for (const [index, template] of templates.entries()) {
    template.templateFamilyId = `pep-junior-illustration-template-${String(index + 1).padStart(3, "0")}`;
  }

  const idByKey = new Map(templates.map((template) => [template.templateKey, template.templateFamilyId]));
  for (const row of rows) {
    row.templateFamilyId = idByKey.get(row.templateKey);
    if (!row.templateFamilyId) throw new Error(`Missing template family for ${row.questionId}`);
  }
}

function refineTemplateRecommendation(row) {
  const prompt = row.promptZhHans;
  const base = categoryConfigs[row.illustrationCategory];

  if (row.illustrationCategory === "explicit_graph_or_figure") {
    return {
      suggestedImageKind: "coordinate plane function graph with two marked points and slope triangle",
      exactMathLabelsNeeded: "yes: point coordinates, axes, slope triangle, and line labels must be deterministic overlays",
      notes: "Single reusable first-batch template for line slope from two points; GPT Image2 should only create the clean graph base."
    };
  }

  if (row.illustrationCategory === "number_line") {
    return {
      suggestedImageKind: "number line with two labeled points and distance bracket",
      exactMathLabelsNeeded: base.exactMathLabelsNeeded,
      notes: "Reuse one number-line template; overlay the two endpoints and distance bracket per question."
    };
  }

  if (row.illustrationCategory === "coordinate_function") {
    if (/平移/.test(prompt)) {
      return {
        suggestedImageKind: "coordinate grid point translation diagram",
        exactMathLabelsNeeded: "yes: original point, translated point, arrow directions, units, and coordinates should be deterministic overlays",
        notes: "Use arrows on a coordinate grid to show horizontal and vertical translation."
      };
    }
    if (/象限/.test(prompt)) {
      return {
        suggestedImageKind: "coordinate quadrant location diagram",
        exactMathLabelsNeeded: "yes: axes, quadrant labels, point label, and coordinates should be deterministic overlays",
        notes: "Use a clean four-quadrant grid and highlight the target quadrant."
      };
    }
    if (/反比例函数/.test(prompt)) {
      return {
        suggestedImageKind: "reciprocal function curve diagram",
        exactMathLabelsNeeded: "yes: axes, branch cues, point coordinates, and k-value labels should be deterministic overlays",
        notes: "Use a neutral reciprocal-curve base; exact k and point labels should be rendered after generation."
      };
    }
    if (/二次函数|对称轴|抛物线/.test(prompt)) {
      return {
        suggestedImageKind: "quadratic parabola with symmetry axis",
        exactMathLabelsNeeded: "yes: vertex, symmetry axis, axes, and equation labels should be deterministic overlays",
        notes: "Use one parabola/symmetry template and overlay exact values outside GPT Image2."
      };
    }
    return {
      suggestedImageKind: "linear function coordinate-plane diagram",
      exactMathLabelsNeeded: base.exactMathLabelsNeeded,
      notes: "Use a coordinate-plane base for linear-function evaluation or interpretation."
    };
  }

  if (row.illustrationCategory === "plane_geometry") {
    if (/仰角|坡度|锐角三角函数|sin|cos|tan/.test(prompt)) {
      return {
        suggestedImageKind: "right-triangle trigonometry/elevation diagram",
        exactMathLabelsNeeded: "yes: angle labels, side lengths, horizontal baseline, vertical height, and trig labels should be deterministic overlays",
        notes: "High-priority geometry template for trigonometry word problems."
      };
    }
    if (/相似/.test(prompt)) {
      return {
        suggestedImageKind: "similar triangles or similar polygons diagram",
        exactMathLabelsNeeded: "yes: corresponding vertices, side lengths, and similarity ratio labels should be deterministic overlays",
        notes: "Use paired similar shapes and overlay exact ratios and side lengths later."
      };
    }
    if (/勾股|直角三角形/.test(prompt)) {
      return {
        suggestedImageKind: "right triangle side-length diagram",
        exactMathLabelsNeeded: "yes: side labels, right-angle mark, and length values should be deterministic overlays",
        notes: "Use a right-triangle base for Pythagorean-reasoning rows."
      };
    }
    if (/平行四边形|矩形|菱形|正方形|四边形/.test(prompt)) {
      return {
        suggestedImageKind: "quadrilateral side/parallel-mark diagram",
        exactMathLabelsNeeded: "yes: vertices, side lengths, parallel marks, and relevant angle labels should be deterministic overlays",
        notes: "Use a clean quadrilateral template with side and parallel cues."
      };
    }
    if (/平行直线|同位角|内错角|截线/.test(prompt)) {
      return {
        suggestedImageKind: "parallel lines cut by a transversal diagram",
        exactMathLabelsNeeded: "yes: line labels, angle arcs, angle values, and parallel marks should be deterministic overlays",
        notes: "Use a transversal template for parallel-line angle relationships."
      };
    }
    if (/圆|圆心|半径|直径|弦|弧|圆周角/.test(prompt)) {
      return {
        suggestedImageKind: "circle geometry diagram",
        exactMathLabelsNeeded: "yes: center, radius, chord, arc, angle, and point labels should be deterministic overlays",
        notes: "Use a reusable circle diagram base with exact labels overlaid later."
      };
    }
    if (/三角形|顶角|底角|全等|轴对称/.test(prompt)) {
      return {
        suggestedImageKind: "triangle angle/congruence diagram",
        exactMathLabelsNeeded: "yes: vertices, angle arcs, side marks, and congruence/symmetry labels should be deterministic overlays",
        notes: "Use triangle templates for angle sums, isosceles triangles, congruence, and symmetry."
      };
    }
    return {
      suggestedImageKind: "basic plane-geometry angle diagram",
      exactMathLabelsNeeded: base.exactMathLabelsNeeded,
      notes: "Use simple line, ray, segment, and angle bases for early geometry rows."
    };
  }

  if (row.illustrationCategory === "statistics_probability") {
    if (/概率|随机|树状图/.test(prompt)) {
      return {
        suggestedImageKind: "sample-space or probability tree diagram",
        exactMathLabelsNeeded: "yes: event labels, counts, branches, and probability fractions should be deterministic overlays",
        notes: "Second-batch optional visual; useful where outcomes or sample spaces need structure."
      };
    }
    return {
      suggestedImageKind: "data table or simple chart diagram",
      exactMathLabelsNeeded: "yes: data values, axes, table cells, and summary statistic labels should be deterministic overlays",
      notes: "Second-batch optional visual; use deterministic overlays for all numbers."
    };
  }

  return {
    suggestedImageKind: base.suggestedImageKind,
    exactMathLabelsNeeded: base.exactMathLabelsNeeded,
    notes: base.notes
  };
}

function compareQuestionRows(a, b) {
  return (
    a.productionOrder - b.productionOrder ||
    (gradeOrder.get(a.grade) ?? 99) - (gradeOrder.get(b.grade) ?? 99) ||
    a.topicId.localeCompare(b.topicId) ||
    (typeOrder.get(a.questionType) ?? 99) - (typeOrder.get(b.questionType) ?? 99) ||
    (difficultyOrder.get(a.difficulty) ?? 99) - (difficultyOrder.get(b.difficulty) ?? 99) ||
    a.questionId.localeCompare(b.questionId)
  );
}

function compareTemplateRows(a, b) {
  return compareTemplateRowsWithoutId(a, b) || a.templateFamilyId.localeCompare(b.templateFamilyId);
}

function compareTemplateRowsWithoutId(a, b) {
  return (
    a.productionOrder - b.productionOrder ||
    (gradeOrder.get(firstGrade(a.gradeBreakdown)) ?? 99) - (gradeOrder.get(firstGrade(b.gradeBreakdown)) ?? 99) ||
    a.topicId.localeCompare(b.topicId) ||
    (typeOrder.get(a.questionType) ?? 99) - (typeOrder.get(b.questionType) ?? 99) ||
    b.questionCount - a.questionCount ||
    a.normalizedPromptTemplate.localeCompare(b.normalizedPromptTemplate, "zh-Hans-CN")
  );
}

function firstGrade(gradeBreakdown) {
  return String(gradeBreakdown).split(":")[0];
}

function summarize(rows, templates) {
  const byCategory = orderedCounts(countBy(rows, "illustrationCategory"));
  const byGrade = sortObject(countBy(rows, "grade"));
  const byType = sortObject(countBy(rows, "questionType"));
  const byDifficulty = orderedDifficultyCounts(countBy(rows, "difficulty"));
  const byPhase = sortObject(countBy(rows, "illustrationPhase"));
  const byGptImage2Batch = sortObject(countBy(rows, "gptImage2Batch"));
  const byGradeAndCategory = countByComposite(rows, ["grade", "illustrationCategory"]);
  const byTopicAndCategory = countByComposite(rows, ["topicId", "unitTitle", "illustrationCategory"]);
  const byTypeAndCategory = countByComposite(rows, ["questionType", "illustrationCategory"]);
  const byDifficultyAndCategory = countByComposite(rows, ["difficulty", "illustrationCategory"]);
  const coreQuestions = rows.filter((row) => coreCategories.has(row.illustrationCategory)).length;
  const broadQuestions = rows.filter((row) => broadCategories.has(row.illustrationCategory)).length;
  const coreTemplateFamilies = templates.filter((template) => coreCategories.has(template.illustrationCategory)).length;
  const broadTemplateFamilies = templates.filter((template) => broadCategories.has(template.illustrationCategory)).length;
  const validation = {
    passed: false,
    checks: [],
    expected: {
      totalQuestions: 1200,
      byGrade: { S1: 400, S2: 400, S3: 400 },
      byType: { "fill-in": 400, "multiple-choice": 400, "short-answer": 400 },
      byCategory: {
        explicit_graph_or_figure: 33,
        coordinate_function: 233,
        number_line: 23,
        plane_geometry: 402,
        statistics_probability: 133,
        text_only: 376
      },
      coreQuestions: 691,
      broadQuestions: 824,
      coreTemplateFamilies: 20,
      broadTemplateFamilies: 23
    }
  };

  return {
    totalQuestions: rows.length,
    byCategory,
    byGrade,
    byType,
    byDifficulty,
    byPhase,
    byGptImage2Batch,
    byGradeAndCategory,
    byTopicAndCategory,
    byTypeAndCategory,
    byDifficultyAndCategory,
    totalTemplateFamilies: templates.length,
    coreQuestions,
    broadQuestions,
    coreTemplateFamilies,
    broadTemplateFamilies,
    validation
  };
}

function validate(summary) {
  const checks = summary.validation.checks;
  const expected = summary.validation.expected;

  checkEqual(checks, "Total question count", summary.totalQuestions, expected.totalQuestions);
  checkObject(checks, "Grade totals", summary.byGrade, expected.byGrade);
  checkObject(checks, "Question type totals", summary.byType, expected.byType);
  checkObject(checks, "Illustration category totals", summary.byCategory, expected.byCategory);
  checkEqual(checks, "Core illustration question count", summary.coreQuestions, expected.coreQuestions);
  checkEqual(checks, "Broad illustration question count", summary.broadQuestions, expected.broadQuestions);
  checkEqual(checks, "Core template family count", summary.coreTemplateFamilies, expected.coreTemplateFamilies);
  checkEqual(checks, "Broad template family count", summary.broadTemplateFamilies, expected.broadTemplateFamilies);
  checkEqual(
    checks,
    "Mutually exclusive category total",
    Object.values(summary.byCategory).reduce((sum, count) => sum + count, 0),
    summary.totalQuestions
  );

  summary.validation.passed = checks.every((check) => check.passed);
  if (!summary.validation.passed) {
    throw new Error(`Illustration-needs validation failed: ${checks.filter((check) => !check.passed).map((check) => check.name).join(", ")}`);
  }
}

function buildCategoryIdRows(rows) {
  return categoryOrder.map((category) => {
    const categoryRows = rows.filter((row) => row.illustrationCategory === category);
    const config = categoryConfigs[category];
    return {
      illustrationCategory: category,
      categoryLabelZh: config.labelZh,
      illustrationPhase: config.phase,
      gptImage2Batch: config.gptImage2Batch,
      questionCount: categoryRows.length,
      questionIds: categoryRows.map((row) => row.questionId).join(" ")
    };
  });
}

function sampleRowsByCategory(rows, sampleSize) {
  return Object.fromEntries(categoryOrder.map((category) => {
    const samples = rows
      .filter((row) => row.illustrationCategory === category)
      .slice(0, sampleSize)
      .map((row) => ({
        questionId: row.questionId,
        grade: row.grade,
        unitTitle: row.unitTitle,
        questionType: row.questionType,
        difficulty: row.difficulty,
        templateFamilyId: row.templateFamilyId,
        promptZhHans: row.promptZhHans
      }));
    return [category, samples];
  }));
}

function questionCsvRow(row) {
  return {
    questionId: row.questionId,
    grade: row.grade,
    semester: row.semester,
    topicId: row.topicId,
    unitTitle: row.unitTitle,
    questionType: row.questionType,
    difficulty: row.difficulty,
    promptZhHans: row.promptZhHans,
    answer: row.answer,
    illustrationCategory: row.illustrationCategory,
    categoryLabelZh: row.categoryLabelZh,
    illustrationPhase: row.illustrationPhase,
    gptImage2Batch: row.gptImage2Batch,
    templateFamilyId: row.templateFamilyId,
    templateKey: row.templateKey,
    normalizedPromptTemplate: row.normalizedPromptTemplate,
    suggestedImageKind: row.suggestedImageKind,
    exactMathLabelsNeeded: row.exactMathLabelsNeeded,
    notes: row.notes
  };
}

function templateCsvRow(template) {
  return {
    templateFamilyId: template.templateFamilyId,
    illustrationCategory: template.illustrationCategory,
    categoryLabelZh: template.categoryLabelZh,
    illustrationPhase: template.illustrationPhase,
    gptImage2Batch: template.gptImage2Batch,
    topicId: template.topicId,
    unitTitle: template.unitTitle,
    questionType: template.questionType,
    questionCount: template.questionCount,
    gradeBreakdown: template.gradeBreakdown,
    difficultyBreakdown: template.difficultyBreakdown,
    representativeQuestionId: template.representativeQuestionId,
    representativePromptZhHans: template.representativePromptZhHans,
    normalizedPromptTemplate: template.normalizedPromptTemplate,
    suggestedImageKind: template.suggestedImageKind,
    exactMathLabelsNeeded: template.exactMathLabelsNeeded,
    notes: template.notes,
    questionIds: template.questionIds
  };
}

function countBy(rows, key) {
  return rows.reduce((acc, row) => {
    acc[row[key]] = (acc[row[key]] ?? 0) + 1;
    return acc;
  }, {});
}

function countByComposite(rows, keys) {
  return rows.reduce((acc, row) => {
    const key = keys.map((field) => row[field]).join(" | ");
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function orderedCounts(counts) {
  return Object.fromEntries(categoryOrder.map((category) => [category, counts[category] ?? 0]));
}

function orderedDifficultyCounts(counts) {
  return Object.fromEntries([...difficultyOrder.keys()].map((difficulty) => [difficulty, counts[difficulty] ?? 0]));
}

function sortObject(value) {
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
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

function toCsv(rows) {
  if (!rows.length) return "";
  const fields = Object.keys(rows[0]);
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

function toMarkdown(summary, templates, categoryIdRows, manualReviewSamples) {
  const firstBatchTemplates = templates.filter((template) => coreCategories.has(template.illustrationCategory));
  const optionalTemplates = templates.filter((template) => template.illustrationCategory === "statistics_probability");

  return `# S18 Mainland PEP Junior Question Illustration-Needs Audit

- Date: ${reportDate}
- Generated at: ${generatedAtHkt} Asia/Hong_Kong
- Session: S18 Curriculum QA and content quality
- Source: \`coordination/content-qa/mainland-pep-junior-generated-bank-v2-1200/question-pack.json\`
- Scope: Mainland PEP junior S1-S3, v2 1200-question pack
- Method: deterministic regex classification over \`promptZhHans\` plus \`optionsZhHans\`; no GPT Image2 calls; no question-bank edits

## Executive Summary

This audit prepares the current Mainland PEP junior question bank for future GPT Image2 illustration planning. It counts question-level illustration needs, groups rows into reusable template families, and separates the first production batch from optional second-batch visual aids.

- Total questions audited: ${summary.totalQuestions}
- Core illustration-needs questions: ${summary.coreQuestions}
- Broad illustration candidates including statistics/probability: ${summary.broadQuestions}
- Text-only / no planned image rows: ${summary.byCategory.text_only}
- Core reusable template families: ${summary.coreTemplateFamilies}
- Broad reusable template families: ${summary.broadTemplateFamilies}
- Recommended GPT Image2 order: plane geometry/trigonometry -> coordinate/function graphs -> number lines -> optional statistics/probability

## Category Totals

${markdownTable(["Category", "Chinese Label", "Phase", "GPT Image2 Batch", "Questions", "Definition"], categoryOrder.map((category) => {
    const config = categoryConfigs[category];
    return [
      category,
      config.labelZh,
      config.phase,
      config.gptImage2Batch,
      summary.byCategory[category],
      config.definition
    ];
  }))}

## Required Count Checks

${markdownTable(["Dimension", "Breakdown"], [
    ["Grade", inlineObject(summary.byGrade)],
    ["Question type", inlineObject(summary.byType)],
    ["Difficulty", inlineObject(summary.byDifficulty)],
    ["Illustration phase", inlineObject(summary.byPhase)],
    ["GPT Image2 batch", inlineObject(summary.byGptImage2Batch)]
  ])}

## Grade, Topic, Type, And Difficulty Cross-Tabs

### By Grade And Category

${markdownTable(["Grade", "Category", "Questions"], compositeRows(summary.byGradeAndCategory))}

### By Topic And Category

${markdownTable(["Topic ID", "Unit Title", "Category", "Questions"], compositeRows(summary.byTopicAndCategory))}

### By Question Type And Category

${markdownTable(["Question Type", "Category", "Questions"], compositeRows(summary.byTypeAndCategory))}

### By Difficulty And Category

${markdownTable(["Difficulty", "Category", "Questions"], compositeRows(summary.byDifficultyAndCategory))}

## GPT Image2 First-Batch Template Queue

The first batch covers ${summary.coreQuestions} core questions through ${summary.coreTemplateFamilies} reusable template families.

${markdownTable(["Template ID", "Category", "Batch", "Questions", "Topic", "Type", "Suggested Image Kind", "Representative Question"], firstBatchTemplates.map((template) => [
    template.templateFamilyId,
    template.categoryLabelZh,
    template.gptImage2Batch,
    template.questionCount,
    `${template.unitTitle} (${template.topicId})`,
    template.questionType,
    template.suggestedImageKind,
    `${template.representativeQuestionId}: ${trimForTable(template.representativePromptZhHans, 90)}`
  ]))}

## Optional Second-Batch Template Queue

The optional batch covers ${summary.byCategory.statistics_probability} statistics/probability rows through ${optionalTemplates.length} template families.

${markdownTable(["Template ID", "Category", "Batch", "Questions", "Topic", "Type", "Suggested Image Kind", "Representative Question"], optionalTemplates.map((template) => [
    template.templateFamilyId,
    template.categoryLabelZh,
    template.gptImage2Batch,
    template.questionCount,
    `${template.unitTitle} (${template.topicId})`,
    template.questionType,
    template.suggestedImageKind,
    `${template.representativeQuestionId}: ${trimForTable(template.representativePromptZhHans, 90)}`
  ]))}

## Category Question ID Lists

Full per-question metadata is in \`${path.basename(questionCsvPath)}\`. The compact category ID list is in \`${path.basename(categoryIdsCsvPath)}\`.

${categoryIdRows.map((row) => `### ${row.categoryLabelZh} (${row.illustrationCategory})

- Phase: ${row.illustrationPhase}
- GPT Image2 batch: ${row.gptImage2Batch}
- Question count: ${row.questionCount}
- Question IDs: ${wrapInlineList(row.questionIds)}
`).join("\n")}

## Manual Review Samples

Each category includes 10 samples for S18 spot-checking before any GPT Image2 production run.

${Object.entries(manualReviewSamples).map(([category, samples]) => {
    const config = categoryConfigs[category];
    return `### ${config.labelZh} (${category})

${markdownTable(["Question ID", "Grade", "Type", "Difficulty", "Template", "Prompt"], samples.map((sample) => [
      sample.questionId,
      sample.grade,
      sample.questionType,
      sample.difficulty,
      sample.templateFamilyId,
      trimForTable(sample.promptZhHans, 110)
    ]))}`;
  }).join("\n\n")}

## Validation

${markdownTable(["Check", "Expected", "Actual", "Status"], summary.validation.checks.map((check) => [
    check.name,
    typeof check.expected === "object" ? inlineObject(check.expected) : check.expected,
    typeof check.actual === "object" ? inlineObject(check.actual) : check.actual,
    check.passed ? "PASS" : "FAIL"
  ]))}

## Files

- Per-question CSV: \`${path.basename(questionCsvPath)}\`
- Template-family CSV: \`${path.basename(templateCsvPath)}\`
- Category question ID CSV: \`${path.basename(categoryIdsCsvPath)}\`
- Machine-readable JSON: \`${path.basename(jsonPath)}\`

## Notes For GPT Image2 Planning

- Start from \`${path.basename(templateCsvPath)}\`, not the raw question list, to generate base diagrams by template family before per-question variants.
- Keep exact mathematical text, coordinates, formulas, values, vertex labels, and answer-critical markings out of GPT Image2 when possible; add them later with deterministic SVG/Canvas overlays.
- The CSV queue deliberately includes \`text_only\` rows as explicit non-targets so totals reconcile to 1200.
- This audit does not verify final pedagogical necessity. It is a production-planning count that should be spot-checked before image generation.
`;
}

function compositeRows(counts) {
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b, "zh-Hans-CN"))
    .map(([key, count]) => [...key.split(" | "), count]);
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

function wrapInlineList(value) {
  const ids = String(value ?? "").split(" ").filter(Boolean);
  const lines = [];
  for (let index = 0; index < ids.length; index += 24) {
    lines.push(ids.slice(index, index + 24).join(" "));
  }
  return lines.join("<br>");
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
