#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../../..");
const defaultInventoryPath = path.join(
  rootDir,
  "coordination/content-qa/hjb-primary-illustration-audit/question-illustration-inventory.json"
);

const args = parseArgs(process.argv.slice(2));
const inventoryPath = args.inventory
  ? path.resolve(rootDir, String(args.inventory))
  : defaultInventoryPath;

const outputRoot = scriptDir;
const candidatesDir = path.join(outputRoot, "candidates");
const reviewDir = path.join(outputRoot, "review");
const queueJsonPath = path.join(outputRoot, "generation-queue.json");
const queueCsvPath = path.join(outputRoot, "generation-queue.csv");
const promptsJsonlPath = path.join(outputRoot, "prompts.jsonl");
const candidateManifestPath = path.join(outputRoot, "candidate-manifest.json");
const manualReviewPath = path.join(outputRoot, "manual-review.csv");
const validationReportPath = path.join(outputRoot, "validation-report.json");
const reviewHtmlPath = path.join(reviewDir, "index.html");
const readmePath = path.join(outputRoot, "README.md");

const expectedTierCounts = {
  A_required: 607,
  B_strong_recommended: 538,
  C_optional_or_text_only: 355
};

const tierOrder = new Map([
  ["A_required", 1],
  ["B_strong_recommended", 2],
  ["C_optional_or_text_only", 3]
]);

const gradeOrder = new Map([
  ["P1", 1],
  ["P2", 2],
  ["P3", 3],
  ["P4", 4],
  ["P5", 5],
  ["P6", 6]
]);

const categoryOrder = [
  "counting_manipulatives",
  "solid_shapes_blocks",
  "time_clock",
  "money_shopping",
  "position_map",
  "plane_geometry",
  "sorting_data_chart",
  "fraction_area_model",
  "measurement_ruler",
  "array_multiplication_division",
  "circle_sector_model",
  "probability_scene",
  "ratio_proportion_model",
  "equation_number_model",
  "text_calculation_only"
];

const categoryConfigs = {
  counting_manipulatives: {
    family: "counting-manipulatives",
    illustrationKind: "counters",
    categoryZhHans: "计数操作物",
    needsDeterministicOverlay: true,
    imageBriefZhHans: "用糖果、积木、圆片、小棒等课堂操作物表现数量、比较、合并或分组，画面简洁，便于后续叠加精确数量或标注。",
    promptDetail: "Use classroom manipulatives such as counters, cubes, sticks, candy, beads, or simple toys. Make the objects easy to count when exact count is visually important, while leaving room for deterministic overlays."
  },
  solid_shapes_blocks: {
    family: "solid-shapes-blocks",
    illustrationKind: "solid",
    categoryZhHans: "立体图形与积木",
    needsDeterministicOverlay: false,
    imageBriefZhHans: "表现正方体、长方体、圆柱、圆锥、球或积木搭建场景，突出形体特征和空间关系。",
    promptDetail: "Show clean 3D solids or block constructions with clear faces, edges, and spatial relationships. Avoid printed labels on the solids."
  },
  time_clock: {
    family: "time-clock",
    illustrationKind: "clock",
    categoryZhHans: "钟面与时间",
    needsDeterministicOverlay: true,
    imageBriefZhHans: "生成无错误文字的钟面或时间线底图，时针分针、数字、刻度和题目标签优先后续确定性叠加。",
    promptDetail: "Create an analog clock or elapsed-time visual base with clean tick marks and blank label zones. Do not rely on the model to render exact clock numbers or time labels."
  },
  money_shopping: {
    family: "money-shopping",
    illustrationKind: "money-scene",
    categoryZhHans: "人民币与购物",
    needsDeterministicOverlay: true,
    imageBriefZhHans: "表现原创购物场景、商品、货币或价格牌底图；精确价格、币值和文字后续叠加。",
    promptDetail: "Show an age-appropriate shopping or classroom store scene with simple products and money-like tokens. Leave blank price-tag areas for deterministic overlays; do not imitate real banknotes in detail."
  },
  position_map: {
    family: "position-map",
    illustrationKind: "map",
    categoryZhHans: "方位与路线图",
    needsDeterministicOverlay: true,
    imageBriefZhHans: "表现方位、前后左右、路线、格子地图或教室平面图底图，具体箭头、文字和坐标后续叠加。",
    promptDetail: "Use a simple map, grid, classroom layout, or route visual with open spaces for arrows and labels. Keep directional relationships visually obvious without printed text."
  },
  plane_geometry: {
    family: "plane-geometry",
    illustrationKind: "geometry-diagram",
    categoryZhHans: "平面几何",
    needsDeterministicOverlay: true,
    imageBriefZhHans: "表现线段、角、圆、长方形、正方形、三角形、组合图形或面积周长示意，精确尺寸和文字后续叠加。",
    promptDetail: "Create a clean geometry support visual with shapes, grid paper, decomposition, angle arcs, or measurement cues. Leave dimensions, formulas, and point names blank for deterministic overlay."
  },
  sorting_data_chart: {
    family: "sorting-data-chart",
    illustrationKind: "chart",
    categoryZhHans: "分类与统计图",
    needsDeterministicOverlay: true,
    imageBriefZhHans: "表现分类物品、象形统计、条形图或折线图底图；坐标轴、分类名、数值和标题后续叠加。",
    promptDetail: "Show a simple data scene, sorting mat, pictograph base, bar chart base, or line-chart base. Keep axes and labels blank so exact text and numbers can be overlaid later."
  },
  fraction_area_model: {
    family: "fraction-area-model",
    illustrationKind: "fraction-area",
    categoryZhHans: "分数面积模型",
    needsDeterministicOverlay: true,
    imageBriefZhHans: "表现分数条、等分面积、阴影部分、圆形/长方形分割模型；精确分数和标签后续叠加。",
    promptDetail: "Use fraction strips, partitioned rectangles, circles, or shaded equal parts. Keep fraction notation and exact labels out of the generated image."
  },
  measurement_ruler: {
    family: "measurement-ruler",
    illustrationKind: "ruler",
    categoryZhHans: "测量与尺规",
    needsDeterministicOverlay: true,
    imageBriefZhHans: "表现尺子、量角器、长度/面积测量或单位格底图，精确刻度数字和尺寸后续叠加。",
    promptDetail: "Show a ruler, measuring setup, grid-paper measurement, or protractor-style cue. Avoid exact numeric markings; leave label zones for deterministic overlays."
  },
  array_multiplication_division: {
    family: "array-multiplication-division",
    illustrationKind: "array",
    categoryZhHans: "阵列、乘除法与等分",
    needsDeterministicOverlay: true,
    imageBriefZhHans: "表现等量分组、阵列、平均分、余数或乘除法模型，精确算式和答案后续叠加。",
    promptDetail: "Show equal groups, trays, rows and columns, or sharing containers. Make grouping visually clear, but do not print multiplication or division sentences."
  },
  circle_sector_model: {
    family: "circle-sector-model",
    illustrationKind: "circle-sector",
    categoryZhHans: "圆与扇形",
    needsDeterministicOverlay: true,
    imageBriefZhHans: "表现圆、半径、直径、扇形、圆心角或周长面积示意，关键点名、角度和公式后续叠加。",
    promptDetail: "Create a clean circle or sector model with visible radius/diameter cues, arcs, or shaded sectors. Leave degree measures and labels blank."
  },
  probability_scene: {
    family: "probability-scene",
    illustrationKind: "probability-scene",
    categoryZhHans: "概率情境",
    needsDeterministicOverlay: true,
    imageBriefZhHans: "表现摸球、转盘、抽卡、袋子或可能性实验底图，精确数量、颜色说明和概率标签后续叠加。",
    promptDetail: "Show a fair probability experiment setup such as balls in a bag, cards, spinner, or containers. Keep exact counts and labels available for deterministic overlay."
  },
  ratio_proportion_model: {
    family: "ratio-proportion-model",
    illustrationKind: "ratio-bar",
    categoryZhHans: "比与比例模型",
    needsDeterministicOverlay: true,
    imageBriefZhHans: "表现比例条、配比、放大缩小、线段图或比例关系底图，精确数字和文字后续叠加。",
    promptDetail: "Use ratio bars, proportional strips, simple recipe/mix visuals, scale drawings, or comparison models. Leave all numerical labels blank."
  },
  equation_number_model: {
    family: "equation-number-model",
    illustrationKind: "equation-scene",
    categoryZhHans: "方程与数形模型",
    needsDeterministicOverlay: true,
    imageBriefZhHans: "表现天平、线段图、数量关系图或未知量模型，具体字母、等式和数字后续叠加。",
    promptDetail: "Show balance scales, part-whole bars, or relationship diagrams for unknown quantities. Avoid equations, variable letters, and answer text in the bitmap."
  },
  text_calculation_only: {
    family: "text-calculation-support",
    illustrationKind: "conceptual-support",
    categoryZhHans: "文字计算支持图",
    needsDeterministicOverlay: false,
    imageBriefZhHans: "为文字题生成轻量数学支持视觉，保持非答案化、无文字、无公式。",
    promptDetail: "Create a light conceptual math support visual with manipulatives or blank workspace. Do not include formulas, final answers, or worksheet-like text."
  }
};

const inventory = readInventory(inventoryPath);
const tierCounts = countBy(inventory, "needTier");
const gradeCounts = countBy(inventory, "grade");
validateInventory({ inventory, tierCounts, gradeCounts });

const queue = inventory
  .filter((row) => row.needTier === "A_required" || row.needTier === "B_strong_recommended")
  .map((row) => queueRowFor(row))
  .sort(compareRows);

validateQueue(queue);

const prompts = queue.map((row) => ({
  questionId: row.questionId,
  needTier: row.needTier,
  visualCategory: row.visualCategory,
  needsDeterministicOverlay: row.needsDeterministicOverlay,
  prompt: buildPrompt(row)
}));

const manifest = {
  metadata: metadataFor({ inventory, tierCounts, gradeCounts, queue }),
  assets: queue.map((row) => manifestRowFor(row))
};

const validationReport = validationReportFor({ inventory, tierCounts, gradeCounts, queue, manifest });

fs.mkdirSync(outputRoot, { recursive: true });
fs.mkdirSync(candidatesDir, { recursive: true });
fs.mkdirSync(reviewDir, { recursive: true });
fs.writeFileSync(queueJsonPath, `${JSON.stringify({ metadata: manifest.metadata, queue }, null, 2)}\n`);
fs.writeFileSync(queueCsvPath, toCsv(queue, queueCsvColumns()));
fs.writeFileSync(promptsJsonlPath, `${prompts.map((row) => JSON.stringify(row)).join("\n")}\n`);
fs.writeFileSync(candidateManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
fs.writeFileSync(manualReviewPath, toCsv(manifest.assets, reviewCsvColumns()));
fs.writeFileSync(validationReportPath, `${JSON.stringify(validationReport, null, 2)}\n`);
fs.writeFileSync(reviewHtmlPath, buildReviewHtml(manifest));
fs.writeFileSync(readmePath, buildReadme(manifest.metadata));

console.log(JSON.stringify(validationReport.summary, null, 2));

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index];
    if (!raw.startsWith("--")) continue;
    const keyValue = raw.slice(2);
    const equalsIndex = keyValue.indexOf("=");
    if (equalsIndex >= 0) {
      parsed[keyValue.slice(0, equalsIndex)] = keyValue.slice(equalsIndex + 1);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      parsed[keyValue] = next;
      index += 1;
    } else {
      parsed[keyValue] = true;
    }
  }
  return parsed;
}

function readInventory(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Inventory not found: ${filePath}`);
  }
  const rows = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!Array.isArray(rows)) {
    throw new Error("Inventory must be a JSON array.");
  }
  return rows.map((row, index) => {
    const required = [
      "questionId",
      "grade",
      "volume",
      "unitTitle",
      "questionType",
      "difficulty",
      "needTier",
      "visualCategory",
      "reason",
      "promptZhHans",
      "assetStatus"
    ];
    const missing = required.filter((key) => row[key] === undefined || row[key] === "");
    if (missing.length) {
      throw new Error(`Inventory row ${index + 1} is missing ${missing.join(", ")}.`);
    }
    return row;
  });
}

function validateInventory({ inventory, tierCounts, gradeCounts }) {
  if (inventory.length !== 1500) {
    throw new Error(`Expected 1500 inventory rows, got ${inventory.length}.`);
  }
  for (const [tier, expected] of Object.entries(expectedTierCounts)) {
    if ((tierCounts[tier] ?? 0) !== expected) {
      throw new Error(`Expected ${tier} count ${expected}, got ${tierCounts[tier] ?? 0}.`);
    }
  }
  for (const grade of ["P1", "P2", "P3", "P4", "P5", "P6"]) {
    if ((gradeCounts[grade] ?? 0) !== 250) {
      throw new Error(`Expected ${grade} count 250, got ${gradeCounts[grade] ?? 0}.`);
    }
  }
}

function validateQueue(rows) {
  const ids = new Set();
  for (const row of rows) {
    if (ids.has(row.questionId)) throw new Error(`Duplicate questionId in queue: ${row.questionId}`);
    ids.add(row.questionId);
    if (!categoryConfigs[row.visualCategory]) {
      throw new Error(`Unsupported visualCategory: ${row.visualCategory}`);
    }
    if (row.assetStatus !== "not-generated") {
      throw new Error(`Queue row ${row.questionId} has unexpected assetStatus ${row.assetStatus}.`);
    }
  }
  const counts = countBy(rows, "needTier");
  if ((counts.A_required ?? 0) !== expectedTierCounts.A_required) {
    throw new Error(`Expected A queue ${expectedTierCounts.A_required}, got ${counts.A_required ?? 0}.`);
  }
  if ((counts.B_strong_recommended ?? 0) !== expectedTierCounts.B_strong_recommended) {
    throw new Error(`Expected B queue ${expectedTierCounts.B_strong_recommended}, got ${counts.B_strong_recommended ?? 0}.`);
  }
  if (rows.length !== expectedTierCounts.A_required + expectedTierCounts.B_strong_recommended) {
    throw new Error(`Expected A+B queue 1145, got ${rows.length}.`);
  }
}

function queueRowFor(row) {
  const config = categoryConfigs[row.visualCategory];
  if (!config) {
    throw new Error(`No category config for ${row.visualCategory}.`);
  }
  const needLevel = row.needTier === "A_required" ? "core" : "recommended";
  return {
    questionId: row.questionId,
    grade: row.grade,
    volume: row.volume,
    unitTitle: row.unitTitle,
    questionType: row.questionType,
    difficulty: row.difficulty,
    needTier: row.needTier,
    needLevel,
    priority: row.needTier === "A_required" ? "P1" : "P2",
    visualCategory: row.visualCategory,
    family: config.family,
    illustrationKind: config.illustrationKind,
    categoryZhHans: config.categoryZhHans,
    reason: row.reason,
    promptZhHans: normalizeWhitespace(row.promptZhHans),
    imageBriefZhHans: config.imageBriefZhHans,
    needsDeterministicOverlay: config.needsDeterministicOverlay,
    assetStatus: "not-generated",
    imagePath: `candidates/${row.questionId}.png`
  };
}

function compareRows(left, right) {
  return (
    (tierOrder.get(left.needTier) ?? 99) - (tierOrder.get(right.needTier) ?? 99) ||
    categoryIndex(left.visualCategory) - categoryIndex(right.visualCategory) ||
    (gradeOrder.get(left.grade) ?? 99) - (gradeOrder.get(right.grade) ?? 99) ||
    left.questionId.localeCompare(right.questionId)
  );
}

function categoryIndex(category) {
  const index = categoryOrder.indexOf(category);
  return index === -1 ? 999 : index;
}

function buildPrompt(row) {
  const config = categoryConfigs[row.visualCategory];
  const overlayInstruction = row.needsDeterministicOverlay
    ? "Important: exact labels, numerals, coordinates, formulas, clock numbers, price text, axis labels, and answer text will be added later with deterministic SVG/Canvas overlay. Leave clean blank zones for those overlays and do not try to render exact written text inside the bitmap."
    : "Do not include equations, final answers, logos, watermarks, textbook page borders, or worksheet-like printed text.";

  return [
    "Create one original square illustration for a primary-school mathematics question.",
    `Audience: mainland China primary student, ${row.grade}; clean, friendly, age-appropriate, classroom-learning style.`,
    `Visual category: ${config.categoryZhHans} (${row.visualCategory}); illustration kind: ${row.illustrationKind}.`,
    `Question summary in Simplified Chinese: ${row.promptZhHans}`,
    `Visual brief: ${row.imageBriefZhHans}`,
    `Category guidance: ${config.promptDetail}`,
    "Use an original composition. Do not copy or imitate any published textbook page, worksheet layout, workbook art, logo, mascot, watermark, or copyrighted illustration.",
    "Keep the image as a standalone learning visual, not a full exercise page. Use generous margins and a plain light background.",
    "Make mathematical objects clear, uncluttered, and reviewable by a curriculum QA reviewer.",
    overlayInstruction,
    "No readable Chinese or English words in the bitmap unless the prompt explicitly requires non-critical environmental signage; avoid all final answers.",
    "Output should be a polished 1024x1024 PNG-style educational illustration."
  ].join("\n");
}

function manifestRowFor(row) {
  return {
    questionId: row.questionId,
    grade: row.grade,
    volume: row.volume,
    unitTitle: row.unitTitle,
    questionType: row.questionType,
    difficulty: row.difficulty,
    needTier: row.needTier,
    needLevel: row.needLevel,
    priority: row.priority,
    visualCategory: row.visualCategory,
    family: row.family,
    illustrationKind: row.illustrationKind,
    reason: row.reason,
    promptZhHans: row.promptZhHans,
    imageBriefZhHans: row.imageBriefZhHans,
    prompt: buildPrompt(row),
    imagePath: row.imagePath,
    model: "gpt-image-2",
    size: "1024x1024",
    quality: "medium",
    outputFormat: "png",
    moderation: "auto",
    needsDeterministicOverlay: row.needsDeterministicOverlay,
    reviewStatus: "not-generated",
    assetStatus: "not-generated",
    generatedAt: null,
    reviewedAt: null,
    reviewer: "",
    reviewNotes: ""
  };
}

function metadataFor({ inventory, tierCounts, gradeCounts, queue }) {
  return {
    packageName: "hjb-primary-question-illustrations-v1",
    sessionId: "S18",
    sourceInventory: path.relative(rootDir, inventoryPath),
    generatedAt: new Date().toISOString(),
    scope: "A_required and B_strong_recommended only; C_optional_or_text_only is deferred.",
    modelDefaults: {
      model: "gpt-image-2",
      size: "1024x1024",
      quality: "medium",
      outputFormat: "png",
      moderation: "auto",
      concurrency: 1
    },
    totals: {
      inventory: inventory.length,
      queue: queue.length,
      A_required: tierCounts.A_required ?? 0,
      B_strong_recommended: tierCounts.B_strong_recommended ?? 0,
      C_optional_or_text_only: tierCounts.C_optional_or_text_only ?? 0,
      A_plus_B: queue.length
    },
    gradeCounts,
    queueTierCounts: countBy(queue, "needTier"),
    queueCategoryCounts: countBy(queue, "visualCategory")
  };
}

function validationReportFor({ inventory, tierCounts, gradeCounts, queue, manifest }) {
  const queueTierCounts = countBy(queue, "needTier");
  const manifestStatusCounts = countBy(manifest.assets, "assetStatus");
  const checks = [
    check("inventory_total_1500", inventory.length === 1500, { actual: inventory.length, expected: 1500 }),
    check("grade_counts_250_each", ["P1", "P2", "P3", "P4", "P5", "P6"].every((grade) => (gradeCounts[grade] ?? 0) === 250), { gradeCounts }),
    check("tier_counts_match_baseline", Object.entries(expectedTierCounts).every(([tier, expected]) => (tierCounts[tier] ?? 0) === expected), { tierCounts, expectedTierCounts }),
    check("queue_A_required_607", (queueTierCounts.A_required ?? 0) === 607, { actual: queueTierCounts.A_required ?? 0, expected: 607 }),
    check("queue_B_strong_recommended_538", (queueTierCounts.B_strong_recommended ?? 0) === 538, { actual: queueTierCounts.B_strong_recommended ?? 0, expected: 538 }),
    check("queue_total_1145", queue.length === 1145, { actual: queue.length, expected: 1145 }),
    check("manifest_all_not_generated", (manifestStatusCounts["not-generated"] ?? 0) === queue.length, { manifestStatusCounts }),
    check("queue_ids_unique", new Set(queue.map((row) => row.questionId)).size === queue.length, { uniqueIds: new Set(queue.map((row) => row.questionId)).size, total: queue.length })
  ];
  return {
    generatedAt: new Date().toISOString(),
    summary: {
      status: checks.every((item) => item.pass) ? "passed" : "failed",
      inventoryTotal: inventory.length,
      queueTotal: queue.length,
      queueTierCounts,
      queueCategoryCounts: countBy(queue, "visualCategory"),
      manifestStatusCounts
    },
    checks
  };
}

function check(name, pass, details) {
  return { name, pass, details };
}

function countBy(rows, key) {
  return rows.reduce((counts, row) => {
    const value = row[key] ?? "";
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function normalizeWhitespace(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function queueCsvColumns() {
  return [
    "questionId",
    "grade",
    "volume",
    "unitTitle",
    "questionType",
    "difficulty",
    "needTier",
    "needLevel",
    "priority",
    "visualCategory",
    "family",
    "illustrationKind",
    "needsDeterministicOverlay",
    "assetStatus",
    "imagePath",
    "reason",
    "promptZhHans",
    "imageBriefZhHans"
  ];
}

function reviewCsvColumns() {
  return [
    "questionId",
    "grade",
    "volume",
    "unitTitle",
    "questionType",
    "difficulty",
    "needTier",
    "visualCategory",
    "needsDeterministicOverlay",
    "imagePath",
    "assetStatus",
    "reviewStatus",
    "reviewDecision",
    "mathObjectCheck",
    "ageAppropriateCheck",
    "copyrightCheck",
    "textErrorCheck",
    "reviewNotes",
    "promptZhHans"
  ];
}

function toCsv(rows, columns) {
  const lines = [columns.join(",")];
  for (const row of rows) {
    lines.push(columns.map((column) => csvCell(row[column])).join(","));
  }
  return `${lines.join("\n")}\n`;
}

function csvCell(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildReviewHtml(manifest) {
  const rowsJson = JSON.stringify(manifest.assets.map((asset) => ({
    questionId: asset.questionId,
    grade: asset.grade,
    volume: asset.volume,
    unitTitle: asset.unitTitle,
    needTier: asset.needTier,
    visualCategory: asset.visualCategory,
    imagePath: `../${asset.imagePath}`,
    assetStatus: asset.assetStatus,
    reviewStatus: asset.reviewStatus,
    needsDeterministicOverlay: asset.needsDeterministicOverlay,
    promptZhHans: asset.promptZhHans
  })));
  return `<!doctype html>
<html lang="zh-Hans">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>HJB Primary Question Illustration Review</title>
  <style>
    :root { color-scheme: light; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #f7f8fb; color: #162033; }
    header { position: sticky; top: 0; z-index: 2; background: rgba(255,255,255,.96); border-bottom: 1px solid #d8deea; padding: 16px 24px; }
    h1 { margin: 0 0 10px; font-size: 20px; }
    .meta { display: flex; flex-wrap: wrap; gap: 12px; font-size: 13px; color: #4d5b73; }
    .filters { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    select, input { border: 1px solid #c8d0dd; border-radius: 6px; padding: 8px 10px; background: #fff; color: #162033; }
    main { padding: 20px 24px 40px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; }
    article { background: #fff; border: 1px solid #dce2ec; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 2px rgba(21,31,48,.05); }
    .thumb { aspect-ratio: 1; background: #edf1f7; display: grid; place-items: center; color: #64748b; font-size: 13px; }
    .thumb img { width: 100%; height: 100%; object-fit: contain; display: block; background: #fff; }
    .body { padding: 12px; }
    .id { font-weight: 700; font-size: 13px; word-break: break-all; }
    .tags { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
    .tag { border: 1px solid #d5ddeb; border-radius: 999px; padding: 3px 7px; font-size: 12px; color: #3d4b62; }
    .prompt { font-size: 13px; line-height: 1.45; color: #26364d; }
    .empty { padding: 60px 20px; text-align: center; color: #64748b; }
  </style>
</head>
<body>
  <header>
    <h1>沪教版小学题目插图候选审核</h1>
    <div class="meta">
      <span>Queue: ${manifest.metadata.totals.queue}</span>
      <span>A_required: ${manifest.metadata.totals.A_required}</span>
      <span>B_strong_recommended: ${manifest.metadata.totals.B_strong_recommended}</span>
      <span>Status: initial not-generated</span>
    </div>
    <div class="filters">
      <select id="tier"><option value="">All tiers</option><option>A_required</option><option>B_strong_recommended</option></select>
      <select id="category"><option value="">All categories</option></select>
      <select id="status"><option value="">All statuses</option><option>not-generated</option><option>generated-pending-review</option><option>generation-failed</option><option>approved</option><option>needs-regeneration</option></select>
      <input id="search" type="search" placeholder="questionId or prompt" />
    </div>
  </header>
  <main><div id="grid" class="grid"></div></main>
  <script>
    const rows = ${rowsJson};
    const grid = document.getElementById("grid");
    const tier = document.getElementById("tier");
    const category = document.getElementById("category");
    const status = document.getElementById("status");
    const search = document.getElementById("search");
    for (const value of [...new Set(rows.map((row) => row.visualCategory))].sort()) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      category.appendChild(option);
    }
    for (const control of [tier, category, status, search]) control.addEventListener("input", render);
    render();
    function render() {
      const query = search.value.trim().toLowerCase();
      const filtered = rows.filter((row) =>
        (!tier.value || row.needTier === tier.value) &&
        (!category.value || row.visualCategory === category.value) &&
        (!status.value || row.assetStatus === status.value || row.reviewStatus === status.value) &&
        (!query || row.questionId.toLowerCase().includes(query) || row.promptZhHans.toLowerCase().includes(query))
      );
      grid.innerHTML = filtered.length ? "" : '<div class="empty">No rows match the current filters.</div>';
      for (const row of filtered) {
        const article = document.createElement("article");
        article.innerHTML = \`
          <div class="thumb"><img src="\${row.imagePath}" alt="\${row.questionId}" onerror="this.remove(); this.parentElement.textContent='Not generated';" /></div>
          <div class="body">
            <div class="id">\${row.questionId}</div>
            <div class="tags">
              <span class="tag">\${row.grade}</span>
              <span class="tag">\${row.needTier}</span>
              <span class="tag">\${row.visualCategory}</span>
              <span class="tag">\${row.assetStatus}</span>
              \${row.needsDeterministicOverlay ? '<span class="tag">overlay</span>' : ''}
            </div>
            <div class="prompt">\${escapeHtml(row.promptZhHans)}</div>
          </div>\`;
        grid.appendChild(article);
      }
    }
    function escapeHtml(value) {
      return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
    }
  </script>
</body>
</html>
`;
}

function buildReadme(metadata) {
  return `# HJB Primary Question Illustrations V1

S18 content-QA generation package for Shanghai Education Publishing House primary math question illustrations.

## Scope

- Source inventory: \`${metadata.sourceInventory}\`
- Queue: \`${metadata.totals.queue}\` questions
- A_required: \`${metadata.totals.A_required}\`
- B_strong_recommended: \`${metadata.totals.B_strong_recommended}\`
- C_optional_or_text_only: deferred
- Output candidates stay in this package under \`candidates/\`; nothing is copied to \`public/\` and no question-bank source files are modified.

## Build and Dry Run

\`\`\`bash
node coordination/content-qa/hjb-primary-question-illustrations-v1/build-generation-queue.mjs
node coordination/content-qa/hjb-primary-question-illustrations-v1/generate-gpt-image2-candidates.mjs --dry-run --tier A_required --limit 30
\`\`\`

## Real Generation

Real GPT Image2 generation requires an owner-approved \`OPENAI_API_KEY\` in the shell environment and budget approval. Do not write the key into project files, logs, reports, or screenshots.

\`\`\`bash
OPENAI_API_KEY=... node coordination/content-qa/hjb-primary-question-illustrations-v1/generate-gpt-image2-candidates.mjs --tier A_required --limit 30 --resume --skip-existing
\`\`\`

Defaults: \`model=gpt-image-2\`, \`size=1024x1024\`, \`quality=medium\`, \`output_format=png\`, \`moderation=auto\`, \`concurrency=1\`.

## Review

- Review page: \`review/index.html\`
- Review spreadsheet: \`manual-review.csv\`
- Manifest: \`candidate-manifest.json\`

S18 should check mathematical objects/counts/shape relations, age suitability, copyright safety, and text/rendering errors. Items needing exact labels, numbers, axis text, coordinates, prices, or clock numerals are marked \`needsDeterministicOverlay=true\` for later SVG/Canvas overlay.
`;
}
