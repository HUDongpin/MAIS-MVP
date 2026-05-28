import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sourceQuestionPackPath = path.resolve(__dirname, "../mainland-hjb-junior-generated-bank-v2-1500/question-pack.json");
const auditJsonPath = path.join(__dirname, "question-illustration-audit.json");
const auditCsvPath = path.join(__dirname, "question-illustration-audit.csv");
const summaryPath = path.join(__dirname, "question-illustration-summary.md");
const manualReviewCsvPath = path.join(__dirname, "manual-review-queue.csv");
const image2CandidatesJsonPath = path.join(__dirname, "gpt-image2-candidates.json");
const image2CandidatesCsvPath = path.join(__dirname, "gpt-image2-candidates.csv");

const illustrationTypes = [
  "geometry-diagram",
  "coordinate-grid",
  "function-graph",
  "statistics-chart",
  "measurement-scene",
  "number-line",
  "conceptual-support",
  "none"
];

const needLevels = ["must-have", "recommended", "not-needed"];

const geometryUnits = new Set([
  "图形的运动",
  "相交线与平行线",
  "三角形",
  "等腰三角形",
  "直角三角形",
  "四边形",
  "相似三角形",
  "锐角的三角比",
  "圆与正多边形"
]);

const functionUnits = new Set(["一次函数", "反比例函数", "二次函数"]);
const coordinateUnits = new Set(["平面直角坐标系"]);
const statisticsUnits = new Set(["统计初步"]);
const mostlySymbolicUnits = new Set(["整式的加减", "整式的乘除", "因式分解", "分式", "实数", "二次根式", "一元二次方程"]);

const explicitVisualCue = /如图|下图|图中|图示|由图|读图|观察图|看图|阴影|网格|示意图|示意/;
const chartCue = /频数分布直方图|直方图|条形图|折线图|扇形图|统计图|图表|统计表|表格|树状图|列表法|列表/;
const coordinateCue = /平面直角坐标系|坐标系|坐标|象限|横坐标|纵坐标|x轴|y轴|原点|关于x轴|关于y轴|关于原点|\([-\d\s,.，]+[-,，]\s*[-\d\s,.，]+\)/;
const functionGraphCue = /函数图[象像]|图[象像]|抛物线|对称轴|顶点|开口|交点|零点|最大值|最小值|增大|减小|单调|平移|经过点|与x轴|与y轴|象限/;
const geometryCue =
  /△|三角形|Rt△|四边形|多边形|平行四边形|矩形|菱形|正方形|圆|⊙|弦|切线|半径|直径|圆心|圆周角|圆心角|弧|正多边形|线段|直线|射线|垂直|平行|交于|连接|中点|对角线|角平分线|垂直平分线|内错角|同位角|对顶角|邻补角|全等|相似|勾股|外角|内角/;
const measurementCue = /仰角|俯角|测量|旗杆|大树|建筑物|教学楼|楼高|塔|河|船|坡|影长|高度|水平面|地面|前进\d*米|米到达/;
const transformationCue = /平移|旋转|翻折|轴对称|对称|位似|缩放|绕.*旋转|沿.*翻折/;
const numberLineCue = /数轴|解集表示|边界点|空心点|实心点|整数解/;
const proofCue = /求证|证明|说明理由|依据是|判定|性质/;
const applicationOnlyCue = /售价|销售|利润|出租车|收费|行驶|商品|成本|月销量|水费|电费|租车|文具|购买|单价|总价/;

const typeRank = new Map(illustrationTypes.map((type, index) => [type, index]));
const needRank = new Map(needLevels.map((level, index) => [level, index]));

function readQuestionPack() {
  if (!existsSync(sourceQuestionPackPath)) {
    throw new Error(`Missing source question pack: ${sourceQuestionPackPath}`);
  }

  const parsed = JSON.parse(readFileSync(sourceQuestionPackPath, "utf8"));
  if (!parsed || !Array.isArray(parsed.questions)) {
    throw new Error("Source question pack must contain a questions array.");
  }

  return parsed.questions;
}

function csvEscape(value) {
  const text = (value === null || value === undefined ? "" : String(value)).replace(/\r?\n/g, " ");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function writeCsv(filePath, rows, columns) {
  const header = columns.map((column) => csvEscape(column.header)).join(",");
  const body = rows.map((row) => columns.map((column) => csvEscape(row[column.key])).join(",")).join("\n");
  writeFileSync(filePath, `${header}\n${body}\n`);
}

function countBy(rows, keyFn) {
  return rows.reduce((accumulator, row) => {
    const key = keyFn(row);
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});
}

function countMatches(text, regex) {
  return [...text.matchAll(regex)].length;
}

function uniqueLatinPointCount(prompt) {
  const matches = prompt.match(/[A-Z](?:[′'])?/g) ?? [];
  return new Set(matches).size;
}

function hasDataList(prompt) {
  return countMatches(prompt, /\d+(?:\.\d+)?/g) >= 8 && /平均数|中位数|众数|方差|频数|成绩|数据|样本/.test(prompt);
}

function joinTags(question) {
  return [
    ...(question.conceptIds ?? []),
    ...(question.competencyTags ?? []),
    ...(question.skillTags ?? []),
    ...(question.misconceptionTags ?? [])
  ].join("；");
}

function detectPrimaryType(question) {
  const prompt = question.promptZhHans ?? "";
  const text = [prompt, question.explanationZhHans, question.unitTitle, joinTags(question)].join(" ");

  if (chartCue.test(prompt) || (statisticsUnits.has(question.unitTitle) && /统计图表|频数|频率/.test(text) && /图|表|直方/.test(prompt))) {
    return "statistics-chart";
  }

  if (statisticsUnits.has(question.unitTitle) && hasDataList(prompt)) {
    return "statistics-chart";
  }

  if (measurementCue.test(prompt)) return "measurement-scene";

  if (coordinateUnits.has(question.unitTitle) || /平面直角坐标系|坐标系|象限|关于x轴|关于y轴|关于原点/.test(prompt)) {
    return "coordinate-grid";
  }

  if (functionUnits.has(question.unitTitle) || (/函数|抛物线|反比例|一次函数|二次函数/.test(text) && functionGraphCue.test(prompt))) {
    return "function-graph";
  }

  if (numberLineCue.test(prompt) || (/一元一次不等式|解集/.test(text) && /数轴|整数解/.test(prompt))) {
    return "number-line";
  }

  if (geometryUnits.has(question.unitTitle) || geometryCue.test(prompt)) {
    return "geometry-diagram";
  }

  if (mostlySymbolicUnits.has(question.unitTitle) && /面积|长方形|正方形|图形|几何意义/.test(prompt)) {
    return "conceptual-support";
  }

  return "none";
}

function makeReason(question, illustrationNeed, illustrationType, signal) {
  if (illustrationNeed === "not-needed") {
    return "题目主要依靠符号运算或文字条件即可作答，逐题插图不是必要投入。";
  }

  const typeReasons = {
    "geometry-diagram": "题干包含几何构型、点线角或圆的关系，原创示意图能稳定呈现已知条件与对应关系。",
    "coordinate-grid": "题干依赖平面直角坐标系、象限或坐标变换，坐标网格图能降低读题和定位负担。",
    "function-graph": "题干涉及函数图象、抛物线、单调性、顶点或参数含义，函数图能支持从符号到图象的转换。",
    "statistics-chart": "题干涉及统计图表或频数分布，重绘图表能让学生直接读取数据结构。",
    "measurement-scene": "题干是仰角、测量或实际距离建模，场景图能明确水平线、垂线和三角比对应边。",
    "number-line": "题干涉及数轴或解集边界，数轴图能清楚表达区间、端点和方向。",
    "conceptual-support": "题干可以用结构图辅助理解，适合做低优先级概念支持图。",
    none: "无插图类型。"
  };

  if (signal) return `${typeReasons[illustrationType]} 判定信号：${signal}。`;
  return typeReasons[illustrationType];
}

function makeGenerationBrief(question, illustrationType) {
  const base = `为沪教版初中数学题 ${question.id} 绘制原创题目插图，单元「${question.unitTitle}」，不要复制教材或试卷版式。`;
  const typeBriefs = {
    "geometry-diagram": "画清点、线、角、平行/垂直/相交/圆等关系；仅呈现题干给出的条件，不暗示未给结论。",
    "coordinate-grid": "绘制简洁坐标网格、坐标轴、关键点和变换箭头；坐标标签必须与题干一致。",
    "function-graph": "绘制函数坐标系和曲线/直线关键特征；突出顶点、交点、对称轴、象限或变化趋势。",
    "statistics-chart": "将题干数据重绘为清晰统计图表；坐标刻度、区间和频数标签必须准确。",
    "measurement-scene": "绘制测量场景示意，标明水平线、垂直高度、观察点、角度和距离，避免真实学校/品牌元素。",
    "number-line": "绘制数轴、端点、开闭圆点和方向箭头；区间边界与题干一致。",
    "conceptual-support": "绘制概念支持图，帮助理解结构，但不要添加题干没有给出的结论。",
    none: "无需生成逐题插图。"
  };

  return `${base} ${typeBriefs[illustrationType]}`;
}

function classifyQuestion(question) {
  const prompt = question.promptZhHans ?? "";
  const tagText = joinTags(question);
  const text = [prompt, question.explanationZhHans, question.unitTitle, tagText].join(" ");
  const pointCount = uniqueLatinPointCount(prompt);
  const illustrationType = detectPrimaryType(question);

  let illustrationNeed = "not-needed";
  let signal = "";
  let confidence = "high";
  let manualReviewRequired = false;

  if (explicitVisualCue.test(prompt)) {
    illustrationNeed = "must-have";
    signal = "题干出现明确图示/读图提示";
  } else if (chartCue.test(prompt)) {
    illustrationNeed = "must-have";
    signal = "题干出现统计图表或列表/树状图提示";
  } else if (coordinateUnits.has(question.unitTitle) || /平面直角坐标系|坐标系/.test(prompt)) {
    illustrationNeed = "must-have";
    signal = "坐标系题需要网格和关键点定位";
  } else if (measurementCue.test(prompt)) {
    illustrationNeed = "must-have";
    signal = "测量/仰角场景需要建模图";
  } else if (functionUnits.has(question.unitTitle) && functionGraphCue.test(prompt)) {
    illustrationNeed = "must-have";
    signal = "函数图象或图象特征是主要表征";
  } else if (question.unitTitle === "圆与正多边形" && geometryCue.test(prompt)) {
    illustrationNeed = "must-have";
    signal = "圆、弦、切线或正多边形构型高度依赖图形";
  } else if (
    geometryUnits.has(question.unitTitle) &&
    (proofCue.test(prompt) || transformationCue.test(prompt) || /点.*边|连接|交于|中点|对角线|角平分线|垂直平分线|平行|垂直/.test(prompt) || pointCount >= 4)
  ) {
    illustrationNeed = "must-have";
    signal = "几何构型包含多点线关系或证明/变换条件";
  } else if (numberLineCue.test(prompt)) {
    illustrationNeed = "must-have";
    signal = "题干直接要求或依赖数轴表达";
  } else if (functionUnits.has(question.unitTitle)) {
    illustrationNeed = applicationOnlyCue.test(prompt) ? "recommended" : "recommended";
    signal = applicationOnlyCue.test(prompt) ? "函数应用题可用图象辅助理解但文字条件可解" : "函数单元适合用图象支持表征转换";
    confidence = applicationOnlyCue.test(prompt) ? "medium" : "high";
    manualReviewRequired = true;
  } else if (geometryUnits.has(question.unitTitle) && geometryCue.test(text)) {
    illustrationNeed = "recommended";
    signal = "几何单元题插图可提升点线角关系理解";
    confidence = /三条线段|内角和|外角等于|周长为|相似比为/.test(prompt) ? "medium" : "high";
    manualReviewRequired = true;
  } else if (question.unitTitle === "一元一次不等式" && /解集|不等式|整数解|范围/.test(prompt)) {
    illustrationNeed = "recommended";
    signal = "不等式解集可用数轴辅助呈现";
    confidence = "medium";
    manualReviewRequired = true;
  } else if (statisticsUnits.has(question.unitTitle) && hasDataList(prompt)) {
    illustrationNeed = "recommended";
    signal = "统计数据列表可转成图表帮助比较";
    confidence = "medium";
    manualReviewRequired = true;
  } else if (mostlySymbolicUnits.has(question.unitTitle) && /面积|长方形|正方形|图形|数轴/.test(prompt)) {
    illustrationNeed = "recommended";
    signal = "符号题中包含可视化结构";
    confidence = "medium";
    manualReviewRequired = true;
  }

  const finalType = illustrationNeed === "not-needed" ? "none" : illustrationType === "none" ? "conceptual-support" : illustrationType;
  if (illustrationNeed === "must-have" && !signal.includes("明确图示") && !chartCue.test(prompt)) {
    manualReviewRequired = pointCount < 3 && finalType === "geometry-diagram";
  }

  return {
    illustrationNeed,
    illustrationType: finalType,
    priority: illustrationNeed === "must-have" ? (explicitVisualCue.test(prompt) || chartCue.test(prompt) ? "P0" : "P1") : illustrationNeed === "recommended" ? "P2" : "P3",
    confidence,
    manualReviewRequired,
    reasonZhHans: makeReason(question, illustrationNeed, finalType, signal),
    generationBriefZhHans: makeGenerationBrief(question, finalType),
    copyrightSafetyZhHans:
      illustrationNeed === "not-needed"
        ? "无需生成题图。"
        : "仅根据当前原创题干重新绘制简洁数学示意图，不复制、还原或近似教材/试卷原图、版式、题序或受保护视觉布局。"
  };
}

function toAuditRecord(question, index) {
  const classification = classifyQuestion(question);
  return {
    index: index + 1,
    id: question.id,
    batch: question.batch,
    grade: question.grade,
    semester: question.semester,
    volume: question.volume,
    topicId: question.topicId,
    unitTitle: question.unitTitle,
    questionType: question.type,
    difficulty: question.difficulty,
    illustrationNeed: classification.illustrationNeed,
    illustrationType: classification.illustrationType,
    priority: classification.priority,
    confidence: classification.confidence,
    manualReviewRequired: classification.manualReviewRequired,
    reasonZhHans: classification.reasonZhHans,
    generationBriefZhHans: classification.generationBriefZhHans,
    copyrightSafetyZhHans: classification.copyrightSafetyZhHans,
    promptZhHans: question.promptZhHans,
    answer: question.answer,
    skillTags: (question.skillTags ?? []).join("；"),
    competencyTags: (question.competencyTags ?? []).join("；"),
    misconceptionTags: (question.misconceptionTags ?? []).join("；"),
    evidenceCardIds: (question.evidenceCardIds ?? []).join("；")
  };
}

function sortObjectEntries(entries) {
  return Object.entries(entries).sort(([left], [right]) => left.localeCompare(right, "zh-Hans"));
}

function markdownTable(headers, rows) {
  const head = `| ${headers.join(" | ")} |`;
  const separator = `| ${headers.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${row.join(" | ")} |`);
  return [head, separator, ...body].join("\n");
}

function buildSummary(auditRecords, image2Candidates) {
  const total = auditRecords.length;
  const byNeed = countBy(auditRecords, (record) => record.illustrationNeed);
  const byType = countBy(auditRecords, (record) => record.illustrationType);
  const byQuestionType = countBy(auditRecords, (record) => record.questionType);
  const byPriority = countBy(auditRecords, (record) => record.priority);
  const manualReviewCount = auditRecords.filter((record) => record.manualReviewRequired).length;
  const needTotal = (byNeed["must-have"] ?? 0) + (byNeed.recommended ?? 0);

  const gradeRows = sortObjectEntries(
    auditRecords.reduce((accumulator, record) => {
      const key = `${record.grade}-${record.semester}`;
      const row = (accumulator[key] ??= { total: 0, must: 0, recommended: 0, notNeeded: 0 });
      row.total += 1;
      if (record.illustrationNeed === "must-have") row.must += 1;
      if (record.illustrationNeed === "recommended") row.recommended += 1;
      if (record.illustrationNeed === "not-needed") row.notNeeded += 1;
      return accumulator;
    }, {})
  ).map(([key, row]) => [key, row.total, row.must, row.recommended, row.notNeeded, row.must + row.recommended]);

  const unitRows = sortObjectEntries(
    auditRecords.reduce((accumulator, record) => {
      const key = `${record.volume}｜${record.unitTitle}`;
      const row = (accumulator[key] ??= {
        total: 0,
        must: 0,
        recommended: 0,
        notNeeded: 0,
        geometry: 0,
        coordinate: 0,
        functionGraph: 0,
        stats: 0,
        measurement: 0,
        numberLine: 0
      });
      row.total += 1;
      if (record.illustrationNeed === "must-have") row.must += 1;
      if (record.illustrationNeed === "recommended") row.recommended += 1;
      if (record.illustrationNeed === "not-needed") row.notNeeded += 1;
      if (record.illustrationType === "geometry-diagram") row.geometry += 1;
      if (record.illustrationType === "coordinate-grid") row.coordinate += 1;
      if (record.illustrationType === "function-graph") row.functionGraph += 1;
      if (record.illustrationType === "statistics-chart") row.stats += 1;
      if (record.illustrationType === "measurement-scene") row.measurement += 1;
      if (record.illustrationType === "number-line") row.numberLine += 1;
      return accumulator;
    }, {})
  ).map(([key, row]) => [
    key,
    row.total,
    row.must,
    row.recommended,
    row.notNeeded,
    row.must + row.recommended,
    row.geometry,
    row.coordinate,
    row.functionGraph,
    row.stats,
    row.measurement,
    row.numberLine
  ]);

  const illustrationTypeRows = illustrationTypes.map((type) => [
    type,
    byType[type] ?? 0,
    auditRecords.filter((record) => record.illustrationType === type && record.illustrationNeed === "must-have").length,
    auditRecords.filter((record) => record.illustrationType === type && record.illustrationNeed === "recommended").length
  ]);

  const highVisualRows = [
    [
      "平面几何",
      auditRecords.filter((record) => record.illustrationType === "geometry-diagram").length,
      auditRecords.filter((record) => record.illustrationType === "geometry-diagram" && record.illustrationNeed === "must-have").length,
      auditRecords.filter((record) => record.illustrationType === "geometry-diagram" && record.illustrationNeed === "recommended").length
    ],
    [
      "坐标与函数",
      auditRecords.filter((record) => record.illustrationType === "coordinate-grid" || record.illustrationType === "function-graph").length,
      auditRecords.filter(
        (record) =>
          (record.illustrationType === "coordinate-grid" || record.illustrationType === "function-graph") &&
          record.illustrationNeed === "must-have"
      ).length,
      auditRecords.filter(
        (record) =>
          (record.illustrationType === "coordinate-grid" || record.illustrationType === "function-graph") &&
          record.illustrationNeed === "recommended"
      ).length
    ],
    [
      "统计图表",
      auditRecords.filter((record) => record.illustrationType === "statistics-chart").length,
      auditRecords.filter((record) => record.illustrationType === "statistics-chart" && record.illustrationNeed === "must-have").length,
      auditRecords.filter((record) => record.illustrationType === "statistics-chart" && record.illustrationNeed === "recommended").length
    ]
  ];

  const samples = auditRecords
    .filter((record) => record.illustrationNeed !== "not-needed")
    .slice(0, 12)
    .map((record) => [
      record.id,
      record.unitTitle,
      record.illustrationNeed,
      record.illustrationType,
      record.reasonZhHans.replace(/\|/g, "；")
    ]);

  return `# 沪教版初中题目插图需求统计

- Date: 2026-05-27
- Session: S18
- Source: \`${path.relative(path.resolve(__dirname, "../../.."), sourceQuestionPackPath)}\`
- Scope: current Mainland HJB junior S1-S3 V2 question pack.
- Image generation: not run. This report prepares GPT Image2 planning metadata only.

## Headline Counts

| Metric | Count |
| --- | ---: |
| Total questions audited | ${total} |
| Must-have question illustrations | ${byNeed["must-have"] ?? 0} |
| Recommended question illustrations pending review | ${byNeed.recommended ?? 0} |
| Not needed | ${byNeed["not-needed"] ?? 0} |
| Total potential illustration need | ${needTotal} |
| GPT Image2 ready candidates | ${image2Candidates.length} |
| Manual review queue | ${manualReviewCount} |

## By Grade And Semester

${markdownTable(["Grade-semester", "Total", "Must-have", "Recommended", "Not needed", "Potential need"], gradeRows)}

## By Illustration Type

${markdownTable(["Illustration type", "Total", "Must-have", "Recommended"], illustrationTypeRows)}

## High-Visual Domains

${markdownTable(["Domain", "Potential need", "Must-have", "Recommended"], highVisualRows)}

## By Unit

${markdownTable(
  [
    "Volume / unit",
    "Total",
    "Must-have",
    "Recommended",
    "Not needed",
    "Potential need",
    "Geometry",
    "Coordinate",
    "Function graph",
    "Statistics",
    "Measurement",
    "Number line"
  ],
  unitRows
)}

## Question Type And Priority

${markdownTable(
  ["Bucket", "Count"],
  [
    ...sortObjectEntries(byQuestionType).map(([key, value]) => [`questionType:${key}`, value]),
    ...sortObjectEntries(byPriority).map(([key, value]) => [`priority:${key}`, value])
  ]
)}

## Sample Candidate Rows

${markdownTable(["Question ID", "Unit", "Need", "Illustration type", "Reason"], samples)}

## Output Files

- \`question-illustration-audit.json\`: full per-question audit with reasons and generation briefs.
- \`question-illustration-audit.csv\`: spreadsheet-friendly full audit.
- \`manual-review-queue.csv\`: recommended or lower-confidence rows to confirm before generation.
- \`gpt-image2-candidates.json\` and \`gpt-image2-candidates.csv\`: must-have rows ready for the first GPT Image2 planning batch. Recommended rows are intentionally excluded until manual confirmation.

## Validation

- Coverage: ${total}/1500 questions.
- Duplicate IDs: ${new Set(auditRecords.map((record) => record.id)).size === total ? "none detected" : "duplicates detected"}.
- Every must-have row has an illustration type and Chinese reason: ${
    auditRecords.every(
      (record) =>
        record.illustrationNeed !== "must-have" ||
        (record.illustrationType !== "none" && record.reasonZhHans.trim().length > 0)
    )
      ? "passed"
      : "failed"
  }.
- Source question bank edits: none.
`;
}

function validate(auditRecords, questions) {
  if (auditRecords.length !== questions.length) {
    throw new Error(`Audit count ${auditRecords.length} does not match question count ${questions.length}.`);
  }

  if (auditRecords.length !== 1500) {
    throw new Error(`Expected 1500 HJB junior questions; got ${auditRecords.length}.`);
  }

  const ids = new Set();
  for (const record of auditRecords) {
    if (ids.has(record.id)) throw new Error(`Duplicate question ID: ${record.id}`);
    ids.add(record.id);
    if (!needRank.has(record.illustrationNeed)) throw new Error(`Invalid need level for ${record.id}: ${record.illustrationNeed}`);
    if (!typeRank.has(record.illustrationType)) throw new Error(`Invalid illustration type for ${record.id}: ${record.illustrationType}`);
    if (record.illustrationNeed === "must-have" && (!record.reasonZhHans.trim() || record.illustrationType === "none")) {
      throw new Error(`Must-have row missing reason or type: ${record.id}`);
    }
  }
}

function main() {
  const questions = readQuestionPack();
  const auditRecords = questions.map(toAuditRecord);
  validate(auditRecords, questions);

  const auditColumns = [
    { key: "index", header: "index" },
    { key: "id", header: "id" },
    { key: "grade", header: "grade" },
    { key: "semester", header: "semester" },
    { key: "volume", header: "volume" },
    { key: "unitTitle", header: "unitTitle" },
    { key: "topicId", header: "topicId" },
    { key: "questionType", header: "questionType" },
    { key: "difficulty", header: "difficulty" },
    { key: "illustrationNeed", header: "illustrationNeed" },
    { key: "illustrationType", header: "illustrationType" },
    { key: "priority", header: "priority" },
    { key: "confidence", header: "confidence" },
    { key: "manualReviewRequired", header: "manualReviewRequired" },
    { key: "reasonZhHans", header: "reasonZhHans" },
    { key: "generationBriefZhHans", header: "generationBriefZhHans" },
    { key: "copyrightSafetyZhHans", header: "copyrightSafetyZhHans" },
    { key: "promptZhHans", header: "promptZhHans" },
    { key: "answer", header: "answer" },
    { key: "skillTags", header: "skillTags" },
    { key: "competencyTags", header: "competencyTags" },
    { key: "misconceptionTags", header: "misconceptionTags" },
    { key: "evidenceCardIds", header: "evidenceCardIds" }
  ];

  const image2Candidates = auditRecords
    .filter((record) => record.illustrationNeed === "must-have")
    .map((record, index) => ({
      candidateIndex: index + 1,
      id: record.id,
      grade: record.grade,
      semester: record.semester,
      volume: record.volume,
      unitTitle: record.unitTitle,
      topicId: record.topicId,
      questionType: record.questionType,
      difficulty: record.difficulty,
      illustrationType: record.illustrationType,
      priority: record.priority,
      promptZhHans: record.promptZhHans,
      answer: record.answer,
      generationBriefZhHans: record.generationBriefZhHans,
      copyrightSafetyZhHans: record.copyrightSafetyZhHans,
      sourceAuditNeed: record.illustrationNeed,
      reviewStatus: "ready-must-have"
    }));

  const manualReviewRows = auditRecords.filter(
    (record) => record.manualReviewRequired || record.illustrationNeed === "recommended"
  );

  writeFileSync(
    auditJsonPath,
    `${JSON.stringify(
      {
        schemaVersion: "mainland-hjb-junior-question-illustration-audit-v1",
        generatedAt: "2026-05-27",
        sourceQuestionPack: path.relative(path.resolve(__dirname, "../../.."), sourceQuestionPackPath),
        totalQuestions: auditRecords.length,
        selectionPolicy:
          "Every question receives an illustrationNeed, illustrationType, reason, and generation brief. GPT Image2 candidates include must-have rows only until recommended rows are manually confirmed.",
        records: auditRecords
      },
      null,
      2
    )}\n`
  );
  writeCsv(auditCsvPath, auditRecords, auditColumns);
  writeCsv(manualReviewCsvPath, manualReviewRows, auditColumns);

  const candidateColumns = [
    { key: "candidateIndex", header: "candidateIndex" },
    { key: "id", header: "id" },
    { key: "grade", header: "grade" },
    { key: "semester", header: "semester" },
    { key: "volume", header: "volume" },
    { key: "unitTitle", header: "unitTitle" },
    { key: "topicId", header: "topicId" },
    { key: "questionType", header: "questionType" },
    { key: "difficulty", header: "difficulty" },
    { key: "illustrationType", header: "illustrationType" },
    { key: "priority", header: "priority" },
    { key: "promptZhHans", header: "promptZhHans" },
    { key: "answer", header: "answer" },
    { key: "generationBriefZhHans", header: "generationBriefZhHans" },
    { key: "copyrightSafetyZhHans", header: "copyrightSafetyZhHans" },
    { key: "sourceAuditNeed", header: "sourceAuditNeed" },
    { key: "reviewStatus", header: "reviewStatus" }
  ];

  writeFileSync(
    image2CandidatesJsonPath,
    `${JSON.stringify(
      {
        schemaVersion: "mainland-hjb-junior-gpt-image2-candidates-v1",
        generatedAt: "2026-05-27",
        sourceAudit: path.basename(auditJsonPath),
        candidatePolicy: "Must-have rows only. Recommended rows remain in manual-review-queue.csv until confirmed.",
        candidates: image2Candidates
      },
      null,
      2
    )}\n`
  );
  writeCsv(image2CandidatesCsvPath, image2Candidates, candidateColumns);
  writeFileSync(summaryPath, buildSummary(auditRecords, image2Candidates));

  const byNeed = countBy(auditRecords, (record) => record.illustrationNeed);
  const byType = countBy(auditRecords, (record) => record.illustrationType);
  console.log(
    JSON.stringify(
      {
        totalQuestions: auditRecords.length,
        byNeed,
        byType,
        manualReviewRows: manualReviewRows.length,
        gptImage2Candidates: image2Candidates.length,
        outputDir: path.relative(process.cwd(), __dirname)
      },
      null,
      2
    )
  );
}

main();
