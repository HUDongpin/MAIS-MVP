#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const outDir = path.join(rootDir, ".tmp/mainland-pep-primary-question-illustration-audit");
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

const artifactStem = `${reportDate}-S18-mainland-pep-primary-question-illustration`;
const csvPath = path.join(scriptDir, `${artifactStem}-queue.csv`);
const jsonlPath = path.join(scriptDir, `${artifactStem}-queue.jsonl`);
const mdPath = path.join(scriptDir, `${artifactStem}-needs.md`);

const familyConfigs = {
  "number-sense": {
    needLevel: "core",
    priority: "P1",
    illustrationKind: "ten-frame",
    categoryZh: "数数物/十框/数的组成",
    rationaleZh: "P1 数感题依赖数量、整体与部分的可视化；十框和计数物能直接支撑数数与分解。"
  },
  "geometry-position": {
    needLevel: "core",
    priority: "P1",
    illustrationKind: "solid",
    categoryZh: "积木/立体图形/位置观察",
    rationaleZh: "立体图形和位置语言对低年级学生高度依赖实物表征。"
  },
  "addition-subtraction": {
    needLevel: "recommended",
    priority: "P2",
    illustrationKind: "counters",
    categoryZh: "具体物加减/拿走与增加",
    rationaleZh: "题目可计算，但具体物能帮助 P1 学生把情境动作转化为加减法。"
  },
  "time-data": {
    needLevel: "core",
    priority: "P1",
    illustrationKind: "bar-chart",
    categoryZh: "分类统计/最多最少",
    rationaleZh: "分类数量比较适合用小型统计图或图标计数承载，能减少低年级读题负担。"
  },
  multiplication: {
    needLevel: "core",
    priority: "P1",
    illustrationKind: "array",
    categoryZh: "相同小组/阵列乘法",
    rationaleZh: "乘法意义需要从几个几、阵列和重复加法建立直观连接。"
  },
  "measurement-geometry": {
    needLevel: "core",
    priority: "P1",
    illustrationKind: "ruler",
    categoryZh: "尺子/角/观察物体",
    rationaleZh: "长度、角和观察物体题需要对齐、方向和形状线索，图像支架价值高。"
  },
  "division-remainder": {
    needLevel: "recommended",
    priority: "P2",
    illustrationKind: "sharing-groups",
    categoryZh: "平均分/包含分/余数",
    rationaleZh: "题目可直接列式，但分组图能帮助学生区分商与余数的意义。"
  },
  "place-value-measurement": {
    needLevel: "core",
    priority: "P1",
    illustrationKind: "blocks",
    categoryZh: "位值方块/千百十个",
    rationaleZh: "万以内数和位值判断适合用位值块、数位表或测量情境辅助。"
  },
  "operations-fractions": {
    needLevel: "core",
    priority: "P1",
    illustrationKind: "fraction-area",
    categoryZh: "分数涂色/平均分整体",
    rationaleZh: "分数初步必须明确整体与平均分，面积模型是核心表征。"
  },
  "measurement-time-geometry": {
    needLevel: "recommended",
    priority: "P2",
    illustrationKind: "clock",
    categoryZh: "钟表/测量/经过时间",
    rationaleZh: "当前题干多为经过时间与测量情境，配钟表或测量图能增强理解但不是全部题目的唯一解题条件。"
  },
  "area-decimals": {
    needLevel: "core",
    priority: "P1",
    illustrationKind: "area-grid",
    categoryZh: "面积方格/长方形模型",
    rationaleZh: "面积与周长容易混淆，方格面积图能直接对应单位面积。"
  },
  "statistics-review": {
    needLevel: "recommended",
    priority: "P2",
    illustrationKind: "bar-chart",
    categoryZh: "数据/平均数/统计表达",
    rationaleZh: "平均数和小数据题可计算，统计图能帮助学生看见数据集合和均衡意义。"
  },
  "large-numbers-multiplication": {
    needLevel: "optional",
    priority: "P3",
    illustrationKind: "array",
    categoryZh: "大数乘法情境/可选阵列",
    rationaleZh: "题目主要是纯计算或普通乘法应用，插图可作情境装饰但不是优先生产对象。"
  },
  "angles-geometry": {
    needLevel: "core",
    priority: "P1",
    illustrationKind: "angle",
    categoryZh: "角/平角/量角器线索",
    rationaleZh: "角的大小、平角关系和方向判断需要几何直观支持。"
  },
  "decimals-average": {
    needLevel: "recommended",
    priority: "P2",
    illustrationKind: "bar-chart",
    categoryZh: "小数测量/平均数数据图",
    rationaleZh: "小数测量和平均数可以通过条形数据图减轻单位与数量解释负担。"
  },
  "perimeter-area-lines": {
    needLevel: "core",
    priority: "P1",
    illustrationKind: "area-grid",
    categoryZh: "长方形周长/面积/平行垂直",
    rationaleZh: "周长与面积的区别适合用边框和方格两种可视模型对照。"
  },
  "decimals-equations": {
    needLevel: "optional",
    priority: "P3",
    illustrationKind: "counters",
    categoryZh: "小数方程/购物情境可选图",
    rationaleZh: "题目主要考小数运算或简易方程，图像支架可选，优先级低于具象和几何数据题。"
  },
  "polygon-area": {
    needLevel: "core",
    priority: "P1",
    illustrationKind: "area-grid",
    categoryZh: "三角形/梯形/平行四边形面积",
    rationaleZh: "多边形面积依赖底、高、分割与转化，必须有清晰图形支架。"
  },
  "factors-fractions": {
    needLevel: "recommended",
    priority: "P2",
    illustrationKind: "fraction-area",
    categoryZh: "分数条/通分约分/分数运算",
    rationaleZh: "分数运算可符号计算，但分数条能解释同分母、整体和等值关系。"
  },
  "volume-data": {
    needLevel: "core",
    priority: "P1",
    illustrationKind: "solid",
    categoryZh: "长方体/正方体/体积单位",
    rationaleZh: "体积、表面积和单位立方体需要空间模型，否则学生容易混淆平方与立方单位。"
  },
  "percent-fractions": {
    needLevel: "recommended",
    priority: "P2",
    illustrationKind: "percent-model",
    categoryZh: "百分数模型/百格/扇形占比",
    rationaleZh: "百分数应用可计算，百格或占比图能帮助学生识别整体和部分。"
  },
  "coordinate-data": {
    needLevel: "core",
    priority: "P1",
    illustrationKind: "coordinate-plane",
    categoryZh: "坐标平面/数对/方向",
    rationaleZh: "数对和位置题需要坐标平面或路线图，图像是核心表征。"
  },
  "ratio-proportion": {
    needLevel: "recommended",
    priority: "P2",
    illustrationKind: "ratio-bar",
    categoryZh: "比/比例/线段图",
    rationaleZh: "比和比例题适合用比例条表达份数关系，尤其适合后续讲解图。"
  },
  "negative-review": {
    needLevel: "core",
    priority: "P1",
    illustrationKind: "number-line",
    categoryZh: "负数数轴/温度变化",
    rationaleZh: "负数大小和温度变化需要参考零点，数轴是核心支架。"
  }
};

const expectedTotals = {
  total: 1200,
  core: 700,
  recommended: 400,
  optional: 100,
  production: 1100
};

const expectedGradeProduction = {
  P1: { total: 200, production: 200, optional: 0 },
  P2: { total: 200, production: 200, optional: 0 },
  P3: { total: 200, production: 200, optional: 0 },
  P4: { total: 200, production: 150, optional: 50 },
  P5: { total: 200, production: 150, optional: 50 },
  P6: { total: 200, production: 200, optional: 0 }
};

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const compile = spawnSync(
  "npx",
  [
    "tsc",
    "-p",
    "tsconfig.json",
    "--outDir",
    outDir,
    "--noEmit",
    "false",
    "--incremental",
    "false",
    "--module",
    "commonjs",
    "--moduleResolution",
    "node"
  ],
  { cwd: rootDir, encoding: "utf8" }
);

if (compile.status !== 0) {
  process.stderr.write(compile.stdout);
  process.stderr.write(compile.stderr);
  process.exit(compile.status ?? 1);
}

const {
  mainlandPepPrimaryQuestionGenerationMetadata,
  mainlandPepPrimaryRagV1Questions
} = require(path.join(outDir, "data/mainlandPepPrimaryQuestions.js"));

const rows = mainlandPepPrimaryRagV1Questions
  .map((question) => {
    const metadata = mainlandPepPrimaryQuestionGenerationMetadata[question.id];
    if (!metadata) throw new Error(`Missing generation metadata for ${question.id}`);
    const config = familyConfigs[metadata.family];
    if (!config) throw new Error(`Missing illustration config for family ${metadata.family}`);
    const promptZhHans = question.prompt.zhHans ?? question.prompt.zh;
    const topicZhHans = question.topic.zhHans ?? question.topic.zh;

    return {
      questionId: question.id,
      grade: question.grade,
      topicId: question.topicId,
      topicZhHans,
      family: metadata.family,
      questionType: question.type,
      needLevel: config.needLevel,
      illustrationKind: config.illustrationKind,
      priority: config.priority,
      productionCandidate: config.needLevel !== "optional",
      promptZhHans,
      imageBriefZhHans: imageBriefFor({ promptZhHans, topicZhHans, config })
    };
  })
  .sort(compareRows);

const totals = {
  total: rows.length,
  core: rows.filter((row) => row.needLevel === "core").length,
  recommended: rows.filter((row) => row.needLevel === "recommended").length,
  optional: rows.filter((row) => row.needLevel === "optional").length,
  production: rows.filter((row) => row.productionCandidate).length
};

const byGrade = countBy(rows, (row) => row.grade);
const byNeedLevel = countBy(rows, (row) => row.needLevel);
const byQuestionType = countBy(rows, (row) => row.questionType);
const byIllustrationKind = countBy(rows, (row) => row.illustrationKind);
const byFamily = countBy(rows, (row) => row.family);
const byGradeNeed = groupCounts(rows, (row) => row.grade, (row) => row.needLevel);
const byFamilyNeed = rowsByFamilyNeed(rows);
const optionalRows = rows.filter((row) => row.needLevel === "optional");
const samplesByFamily = sampleRowsByFamily(rows, 5);
const validations = buildValidations({ rows, totals, byGradeNeed, samplesByFamily, optionalRows });

assertValidation(validations);

fs.writeFileSync(csvPath, toCsv(rows), "utf8");
fs.writeFileSync(jsonlPath, rows.map((row) => JSON.stringify(row)).join("\n") + "\n", "utf8");
fs.writeFileSync(mdPath, buildMarkdown(), "utf8");

console.log(JSON.stringify({
  report: path.relative(rootDir, mdPath),
  csv: path.relative(rootDir, csvPath),
  jsonl: path.relative(rootDir, jsonlPath),
  totals,
  validations: validations.map(({ check, status }) => ({ check, status }))
}, null, 2));

function compareRows(left, right) {
  return (
    gradeRank(left.grade) - gradeRank(right.grade) ||
    familyRank(left.family) - familyRank(right.family) ||
    priorityRank(left.priority) - priorityRank(right.priority) ||
    left.questionId.localeCompare(right.questionId)
  );
}

function gradeRank(grade) {
  return { P1: 1, P2: 2, P3: 3, P4: 4, P5: 5, P6: 6 }[grade] ?? 99;
}

function familyRank(family) {
  return Object.keys(familyConfigs).indexOf(family) + 1 || 99;
}

function priorityRank(priority) {
  return { P1: 1, P2: 2, P3: 3 }[priority] ?? 99;
}

function imageBriefFor({ promptZhHans, topicZhHans, config }) {
  return [
    `为人教版小学数学“${topicZhHans}”题目生成一张${config.categoryZh}题目插图。`,
    `题干：${promptZhHans}`,
    `画面要求：原创、儿童友好、清晰留白、不要教材页截图、不要品牌标识、不要生成答案；精确数字和公式后续可由程序叠加。`
  ].join("");
}

function toCsv(items) {
  const headers = [
    "questionId",
    "grade",
    "family",
    "needLevel",
    "illustrationKind",
    "priority",
    "promptZhHans",
    "imageBriefZhHans"
  ];
  return [
    headers.join(","),
    ...items.map((item) => headers.map((header) => csvEscape(item[header])).join(","))
  ].join("\n") + "\n";
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function countBy(items, keyFn) {
  const counts = {};
  for (const item of items) {
    const key = keyFn(item);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}

function groupCounts(items, rowKeyFn, columnKeyFn) {
  const grouped = {};
  for (const item of items) {
    const rowKey = rowKeyFn(item);
    const columnKey = columnKeyFn(item);
    grouped[rowKey] ??= {};
    grouped[rowKey][columnKey] = (grouped[rowKey][columnKey] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(grouped).sort(([left], [right]) => left.localeCompare(right)));
}

function rowsByFamilyNeed(items) {
  return Object.entries(groupCounts(items, (row) => row.family, (row) => row.needLevel)).map(([family, counts]) => ({
    family,
    topicZhHans: items.find((row) => row.family === family)?.topicZhHans ?? "",
    needLevel: Object.keys(counts)[0],
    illustrationKind: familyConfigs[family].illustrationKind,
    categoryZh: familyConfigs[family].categoryZh,
    count: Object.values(counts).reduce((sum, count) => sum + count, 0),
    rationaleZh: familyConfigs[family].rationaleZh
  }));
}

function sampleRowsByFamily(items, size) {
  const samples = {};
  for (const row of items) {
    samples[row.family] ??= [];
    if (samples[row.family].length < size) samples[row.family].push(row);
  }
  return samples;
}

function buildValidations({ rows, totals, byGradeNeed, samplesByFamily, optionalRows }) {
  const gradeChecks = Object.entries(expectedGradeProduction).map(([grade, expected]) => {
    const gradeRows = rows.filter((row) => row.grade === grade);
    const optional = byGradeNeed[grade]?.optional ?? 0;
    const production = gradeRows.length - optional;
    return {
      check: `${grade} production total`,
      expected: `total ${expected.total}, production ${expected.production}, optional ${expected.optional}`,
      actual: `total ${gradeRows.length}, production ${production}, optional ${optional}`,
      status: gradeRows.length === expected.total && production === expected.production && optional === expected.optional ? "PASS" : "FAIL"
    };
  });

  return [
    {
      check: "Total question count",
      expected: String(expectedTotals.total),
      actual: String(totals.total),
      status: totals.total === expectedTotals.total ? "PASS" : "FAIL"
    },
    {
      check: "Need-level totals",
      expected: `core ${expectedTotals.core}, recommended ${expectedTotals.recommended}, optional ${expectedTotals.optional}`,
      actual: `core ${totals.core}, recommended ${totals.recommended}, optional ${totals.optional}`,
      status: totals.core === expectedTotals.core && totals.recommended === expectedTotals.recommended && totals.optional === expectedTotals.optional ? "PASS" : "FAIL"
    },
    {
      check: "Suggested GPT Image2 production count",
      expected: String(expectedTotals.production),
      actual: String(totals.production),
      status: totals.production === expectedTotals.production ? "PASS" : "FAIL"
    },
    {
      check: "Every family has 5 manual-review samples",
      expected: "24 families x 5 samples",
      actual: `${Object.values(samplesByFamily).filter((sampleRows) => sampleRows.length >= 5).length} families x >=5 samples`,
      status: Object.values(samplesByFamily).every((sampleRows) => sampleRows.length >= 5) ? "PASS" : "FAIL"
    },
    {
      check: "Optional full-review pool",
      expected: "100 optional rows",
      actual: `${optionalRows.length} optional rows`,
      status: optionalRows.length === expectedTotals.optional ? "PASS" : "FAIL"
    },
    ...gradeChecks
  ];
}

function assertValidation(validations) {
  const failed = validations.filter((validation) => validation.status !== "PASS");
  if (failed.length) {
    throw new Error(`Validation failed: ${failed.map((validation) => validation.check).join("; ")}`);
  }
}

function buildMarkdown() {
  const gradeRows = Object.entries(expectedGradeProduction).map(([grade]) => {
    const total = byGrade[grade] ?? 0;
    const core = byGradeNeed[grade]?.core ?? 0;
    const recommended = byGradeNeed[grade]?.recommended ?? 0;
    const optional = byGradeNeed[grade]?.optional ?? 0;
    const production = core + recommended;
    return `| ${grade} | ${total} | ${production} | ${core} | ${recommended} | ${optional} | ${mainKindsForGrade(grade)} |`;
  }).join("\n");

  const familyRows = byFamilyNeed.map((row) =>
    `| ${row.topicZhHans} | \`${row.family}\` | ${row.count} | \`${row.needLevel}\` | \`${row.illustrationKind}\` | ${row.categoryZh} | ${row.rationaleZh} |`
  ).join("\n");

  const validationRows = validations.map((validation) =>
    `| ${validation.check} | ${validation.expected} | ${validation.actual} | ${validation.status} |`
  ).join("\n");

  const sampleSections = Object.entries(samplesByFamily)
    .map(([family, sampleRows]) => [
      `### ${familyConfigs[family].categoryZh} (\`${family}\`)`,
      "",
      "| Question ID | Grade | Type | Need | Kind | Prompt |",
      "| --- | --- | --- | --- | --- | --- |",
      sampleRows.map((row) => `| ${row.questionId} | ${row.grade} | ${row.questionType} | \`${row.needLevel}\` | \`${row.illustrationKind}\` | ${escapeMd(row.promptZhHans)} |`).join("\n")
    ].join("\n"))
    .join("\n\n");

  const optionalIndexRows = optionalRows
    .reduce((groups, row) => {
      groups[row.family] ??= [];
      groups[row.family].push(row.questionId);
      return groups;
    }, {});

  const optionalIndex = Object.entries(optionalIndexRows)
    .map(([family, ids]) => [
      `### ${familyConfigs[family].categoryZh} (\`${family}\`)`,
      "",
      ids.map((id) => `\`${id}\``).join(", ")
    ].join("\n"))
    .join("\n\n");

  return `# S18 Mainland PEP Primary Question Illustration Needs Audit

- Date: ${reportDate}
- Generated at: ${generatedAtHkt} Asia/Hong_Kong
- Session: S18 Curriculum QA and content quality
- Source: \`data/mainlandPepPrimaryQuestions.ts\`
- Scope: MAINLAND_PEP primary P1-P6, current \`primary-rag-v1\` question bank
- Output queue CSV: \`${path.basename(csvPath)}\`
- Output queue JSONL: \`${path.basename(jsonlPath)}\`

## Executive Summary

This audit classifies all 1,200 Mainland PEP primary questions for question-level illustration production under the strong-recommendation standard: illustrations are counted when they materially improve young learners' understanding, not only when a question is impossible without an image.

- Total audited questions: ${totals.total}
- Suggested GPT Image2 production candidates: ${totals.production}
- Optional / low-priority illustration candidates: ${totals.optional}
- Need-level split: core ${totals.core}, recommended ${totals.recommended}, optional ${totals.optional}
- No GPT Image2 calls were made; this is a planning and counting artifact only.
- Existing lesson-level illustrations are not treated as question-level diagrams.

## Need-Level Definitions

| Need Level | Priority | Meaning | Production Decision |
| --- | --- | --- | --- |
| \`core\` | P1 | The representation is central to the math idea, especially for counting, geometry, fraction, area, volume, coordinate, and number-line reasoning. | Generate first |
| \`recommended\` | P2 | The question is answerable from text, but a concrete visual strongly supports primary students' modeling and explanation. | Generate after P1 |
| \`optional\` | P3 | The question is mainly symbolic or ordinary computation; an image can decorate or scaffold but is not needed for the first production pass. | Hold unless full coverage is desired |

## Grade Totals

| Grade | Total | Suggested For Images | Core | Recommended | Optional | Main Illustration Kinds |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
${gradeRows}

## Global Totals

| Dimension | Breakdown |
| --- | --- |
| Need level | ${formatCounts(byNeedLevel)} |
| Question type | ${formatCounts(byQuestionType)} |
| Illustration kind | ${formatCounts(byIllustrationKind)} |
| Family count | ${formatCounts(byFamily)} |

## Family Classification

| Topic | Family | Questions | Need | Kind | Category | Rationale |
| --- | --- | ---: | --- | --- | --- | --- |
${familyRows}

## Validation

| Check | Expected | Actual | Status |
| --- | --- | --- | --- |
${validationRows}

## Manual Review Samples

Each family includes 5 sample questions for S18 spot-checking before GPT Image2 production. Samples confirm that the rule-based family classification maps to the current generated prompts.

${sampleSections}

## Optional Full-Review Index

The 100 optional rows were reviewed as the complete optional pool. They are not recommended for the first GPT Image2 production pass unless the owner wants full 1,200-question visual coverage.

${optionalIndex}

## GPT Image2 Production Guidance

- First pass: generate only \`core\` and \`recommended\` rows, total ${totals.production}.
- Keep exact numerals, answer choices, formulas, and labels out of the image model where practical; add them later as deterministic overlays if question-level rendering is implemented.
- Use the \`illustrationKind\` column to batch similar prompts and create reusable visual templates.
- Do not copy textbook visual layouts, screenshots, publisher marks, or workbook page designs.
- Do not modify \`Question\` types or product question data until asset naming, storage, and UI rendering are separately assigned.

## Checks Not Run

Not run: content QA/report-only change. The generator performed its own count validations and compiled the source question data into \`.tmp/\` for read-only inspection.
`;
}

function mainKindsForGrade(grade) {
  const kinds = new Set(rows.filter((row) => row.grade === grade && row.productionCandidate).map((row) => familyConfigs[row.family].categoryZh));
  return Array.from(kinds).join("、");
}

function formatCounts(counts) {
  return Object.entries(counts).map(([key, count]) => `${key}: ${count}`).join("; ");
}

function escapeMd(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function formatHktDate(date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}
