#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../../..");
const sourceQueuePath = path.join(
  rootDir,
  "coordination/content-qa/2026-05-27-S18-mainland-pep-primary-question-illustration-queue.jsonl"
);
const outputRoot = scriptDir;
const candidatesDir = path.join(outputRoot, "candidates");
const generationResultsPath = path.join(outputRoot, "generation-results.jsonl");
const dryRunResultsPath = path.join(outputRoot, "dry-run-results.jsonl");
const manualReviewPath = path.join(outputRoot, "manual-review.csv");
const validationReportPath = path.join(outputRoot, "validation-report.json");
const indexMdPath = path.join(outputRoot, "index.md");
const indexHtmlPath = path.join(outputRoot, "index.html");

const args = parseArgs(process.argv.slice(2));
const mode = args.mode ?? "smoke";
const dryRun = Boolean(args["dry-run"]);
const force = Boolean(args.force);
const onlyMissing = args["only-missing"] !== "false";
const queuePath = args.queue ? path.resolve(rootDir, String(args.queue)) : sourceQueuePath;
const model = String(process.env.GPT_IMAGE_MODEL ?? args.model ?? "gpt-image-2");
const quality = String(process.env.GPT_IMAGE_QUALITY ?? args.quality ?? "medium");
const size = String(process.env.GPT_IMAGE_SIZE ?? args.size ?? "1024x1024");
const outputFormat = String(process.env.GPT_IMAGE_OUTPUT_FORMAT ?? args["output-format"] ?? "png");
const moderation = String(process.env.GPT_IMAGE_MODERATION ?? args.moderation ?? "auto");
const concurrency = positiveInteger(process.env.GPT_IMAGE_CONCURRENCY ?? args.concurrency, 1);
const maxRetries = positiveInteger(process.env.GPT_IMAGE_MAX_RETRIES ?? args.retries, 4);
const delayMs = nonNegativeInteger(process.env.GPT_IMAGE_DELAY_MS ?? args.delay, 0);
const limit = args.limit === undefined ? null : positiveInteger(args.limit, 0);
const importQuestionId = args["import-question-id"] ? String(args["import-question-id"]) : null;
const importSource = args["import-source"] ? path.resolve(rootDir, String(args["import-source"])) : null;
const importLatest = Boolean(args["import-latest"]);
const nextBuiltIn = Boolean(args["next-built-in"]);
const builtInStatus = Boolean(args["built-in-status"]);
const rebuildReview = Boolean(args["rebuild-review"]);
const nextCount = positiveInteger(args.count, mode === "smoke" ? 24 : 12);

const familyOrder = [
  "number-sense",
  "geometry-position",
  "addition-subtraction",
  "time-data",
  "multiplication",
  "measurement-geometry",
  "division-remainder",
  "place-value-measurement",
  "operations-fractions",
  "measurement-time-geometry",
  "area-decimals",
  "statistics-review",
  "large-numbers-multiplication",
  "angles-geometry",
  "decimals-average",
  "perimeter-area-lines",
  "decimals-equations",
  "polygon-area",
  "factors-fractions",
  "volume-data",
  "percent-fractions",
  "coordinate-data",
  "ratio-proportion",
  "negative-review"
];

const kindInstructions = {
  "ten-frame": "Show ten-frame style counters, small manipulatives, and part-whole areas. Leave blank space for deterministic number labels.",
  solid: "Show simple classroom blocks or clean 3D solids with no labels, watermarks, textbook page borders, or answer text.",
  counters: "Show concrete objects being added, removed, grouped, or compared. Keep counts schematic rather than answer-bearing if exact counting would reveal the answer.",
  "bar-chart": "Show a simple original pictograph or bar-chart style support visual with empty label zones; avoid exact axis text rendered by the model.",
  array: "Show equal groups or a neat array of manipulatives. Keep rows and columns visually clear, with no multiplication sentence or final answer.",
  ruler: "Show a ruler or measuring setup, angle cue, or viewpoint card as a learning support visual; do not render exact numeric labels.",
  "sharing-groups": "Show equal sharing, grouping containers, and visible leftover space; do not render the quotient or final answer.",
  blocks: "Show place-value blocks or a place-value mat with empty columns for later labels; no exact digits or answer text.",
  "fraction-area": "Show fraction strips, area partitions, or shaded equal parts as a concept support visual; avoid writing exact fraction answers.",
  clock: "Show an analog clock or elapsed-time timeline with clear blank label areas; do not render exact answer text.",
  "area-grid": "Show grid paper, rectangle/polygon decomposition, or unit-square reasoning; leave formula and dimension labels for later overlay.",
  angle: "Show rays, angle arcs, a straight angle relation, or a protractor-style cue; no exact degree answer.",
  "coordinate-plane": "Show a clean coordinate plane or route-map base with axes/grid and blank point label areas; exact coordinates should be overlaid later.",
  "number-line": "Show a number line or thermometer-style zero reference, with blank tick labels; avoid writing the final value.",
  "percent-model": "Show a hundred grid, percent bar, or pie-style part-whole model with blank labels; do not write the answer.",
  "ratio-bar": "Show a ratio bar or proportional strip model with clearly separated parts and blank labels; no final value."
};

const needLevelOrder = new Map([
  ["core", 1],
  ["recommended", 2],
  ["optional", 3]
]);

const gradeOrder = new Map([
  ["P1", 1],
  ["P2", 2],
  ["P3", 3],
  ["P4", 4],
  ["P5", 5],
  ["P6", 6]
]);

const queue = readQueue(queuePath).sort(compareQueueRows);
const selectedRows = selectRows(queue, mode, limit);

fs.mkdirSync(candidatesDir, { recursive: true });

if (builtInStatus) {
  console.log(JSON.stringify(builtInStatusSummary(), null, 2));
  process.exit(0);
}

if (nextBuiltIn) {
  console.log(JSON.stringify(nextBuiltInBatch(nextCount), null, 2));
  process.exit(0);
}

if (rebuildReview) {
  const resultRows = readResultRows(generationResultsPath);
  writeReviewArtifacts({ rows: queue, resultRows, dryRun: false });
  console.log(JSON.stringify(summaryFor({ selectedRows: queue, resultRows, dryRun: false }), null, 2));
  process.exit(0);
}

if (importQuestionId || importSource || importLatest) {
  if (!importQuestionId || (!importSource && !importLatest)) {
    throw new Error("Import mode requires --import-question-id with either --import-source or --import-latest.");
  }
  const sourcePath = importLatest ? findLatestBuiltInImage() : importSource;
  const importedResult = importBuiltInImage(importQuestionId, sourcePath);
  const allResultRows = mergeResultRows(readResultRows(generationResultsPath), [importedResult]);
  writeJsonl(generationResultsPath, allResultRows);
  writeReviewArtifacts({ rows: queue, resultRows: allResultRows, dryRun: false });
  console.log(JSON.stringify({
    imported: importedResult.questionId,
    imagePath: importedResult.imagePath,
    sourcePath: importedResult.sourcePath,
    replacement: importedResult.replacement ?? null,
    generationResults: path.relative(rootDir, generationResultsPath),
    manualReview: path.relative(rootDir, manualReviewPath),
    validationReport: path.relative(rootDir, validationReportPath)
  }, null, 2));
  process.exit(0);
}

if (dryRun) {
  const dryRunResults = selectedRows.map((row) => resultFor(row, {
    status: "dry-run",
    prompt: buildPrompt(row),
    imagePath: imageRelativePath(row),
    model,
    quality,
    size,
    outputFormat,
    moderation
  }));
  writeJsonl(dryRunResultsPath, dryRunResults);
  writeReviewArtifacts({ rows: selectedRows, resultRows: dryRunResults, dryRun: true });
  console.log(JSON.stringify(summaryFor({ selectedRows, resultRows: dryRunResults, dryRun: true }), null, 2));
  process.exit(0);
}

if (!process.env.OPENAI_API_KEY) {
  console.error("Blocked: OPENAI_API_KEY is missing. Set it in the shell environment before running GPT Image2 generation.");
  process.exit(2);
}

const completed = readCompletedResults(generationResultsPath);
const workRows = selectedRows.filter((row) => {
  if (force) return true;
  if (!onlyMissing) return true;
  const imagePath = absoluteImagePath(row);
  return !completed.has(row.questionId) || !fs.existsSync(imagePath);
});

const runResults = await runQueue(workRows);
const allResultRows = mergeResultRows(readResultRows(generationResultsPath), runResults);
writeReviewArtifacts({ rows: selectedRows, resultRows: allResultRows, dryRun: false });
console.log(JSON.stringify(summaryFor({ selectedRows, resultRows: allResultRows, dryRun: false }), null, 2));

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index];
    if (!raw.startsWith("--")) continue;
    const keyValue = raw.slice(2);
    const equalsIndex = keyValue.indexOf("=");
    if (equalsIndex >= 0) {
      parsed[keyValue.slice(0, equalsIndex)] = keyValue.slice(equalsIndex + 1);
    } else {
      const next = argv[index + 1];
      if (next && !next.startsWith("--")) {
        parsed[keyValue] = next;
        index += 1;
      } else {
        parsed[keyValue] = true;
      }
    }
  }
  return parsed;
}

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function nonNegativeInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function readQueue(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`Queue file not found: ${filePath}`);
  return fs.readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => {
      const row = JSON.parse(line);
      const required = ["questionId", "grade", "family", "needLevel", "illustrationKind", "priority", "promptZhHans", "imageBriefZhHans"];
      const missing = required.filter((key) => !row[key]);
      if (missing.length) throw new Error(`Queue line ${index + 1} is missing ${missing.join(", ")}`);
      return row;
    });
}

function compareQueueRows(left, right) {
  return (
    (needLevelOrder.get(left.needLevel) ?? 99) - (needLevelOrder.get(right.needLevel) ?? 99) ||
    (gradeOrder.get(left.grade) ?? 99) - (gradeOrder.get(right.grade) ?? 99) ||
    familyOrder.indexOf(left.family) - familyOrder.indexOf(right.family) ||
    left.questionId.localeCompare(right.questionId)
  );
}

function selectRows(rows, selectedMode, selectedLimit) {
  let selected;
  if (selectedMode === "full") {
    selected = rows;
  } else if (selectedMode === "smoke") {
    selected = onePerFamily(rows);
  } else if (selectedMode === "core") {
    selected = rows.filter((row) => row.needLevel === "core");
  } else if (selectedMode === "recommended") {
    selected = rows.filter((row) => row.needLevel === "recommended");
  } else if (selectedMode === "optional") {
    selected = rows.filter((row) => row.needLevel === "optional");
  } else {
    throw new Error(`Unknown mode: ${selectedMode}. Use smoke, full, core, recommended, or optional.`);
  }
  return selectedLimit ? selected.slice(0, selectedLimit) : selected;
}

function onePerFamily(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    if (seen.has(row.family)) return false;
    seen.add(row.family);
    return true;
  });
}

function builtInStatusSummary() {
  const resultRows = readResultRows(generationResultsPath);
  const resultById = new Map(resultRows.map((row) => [row.questionId, row]));
  const reviewById = readManualReviewById();
  const imageRows = queue.map((row) => {
    const result = resultById.get(row.questionId);
    const review = reviewById.get(row.questionId);
    const imagePath = absoluteImagePath(row);
    return {
      ...row,
      result,
      review,
      imagePath,
      imagePresent: fs.existsSync(imagePath),
      reviewStatus: review?.status ?? statusForReview(row, result, review)
    };
  });
  const generatedRows = imageRows.filter((row) => row.imagePresent && row.result?.status === "generated");
  const missingRows = imageRows.filter((row) => !row.imagePresent);
  const reviseRows = imageRows.filter((row) => row.reviewStatus === "revise");
  const smokeFamilies = new Set(generatedRows.map((row) => row.family));
  const missingSmokeFamilies = familyOrder.filter((family) => !smokeFamilies.has(family));
  const nextBatch = nextBuiltInRows(12).map(nextBuiltInItem);

  return {
    generatedAt: new Date().toISOString(),
    queuePath: path.relative(rootDir, queuePath),
    outputRoot: path.relative(rootDir, outputRoot),
    totalQuestions: queue.length,
    imagesPresent: generatedRows.length,
    missingImages: missingRows.length,
    smokeFamiliesComplete: smokeFamilies.size,
    smokeFamiliesExpected: familyOrder.length,
    missingSmokeFamilies,
    reviewStatusCounts: countBy(imageRows, (row) => row.reviewStatus),
    needLevelCounts: countBy(queue, (row) => row.needLevel),
    generatedByNeedLevel: countBy(generatedRows, (row) => row.needLevel),
    missingByNeedLevel: countBy(missingRows, (row) => row.needLevel),
    reviseQuestionIds: reviseRows.map((row) => row.questionId),
    nextRecommendedBatch: nextBatch
  };
}

function nextBuiltInBatch(count) {
  const rows = nextBuiltInRows(count);
  return {
    generatedAt: new Date().toISOString(),
    count: rows.length,
    totalRequested: count,
    mode,
    items: rows.map(nextBuiltInItem)
  };
}

function nextBuiltInRows(count) {
  const resultById = new Map(readResultRows(generationResultsPath).map((row) => [row.questionId, row]));
  const reviewById = readManualReviewById();
  const rowState = (row) => {
    const result = resultById.get(row.questionId);
    const review = reviewById.get(row.questionId);
    const imagePresent = fs.existsSync(absoluteImagePath(row));
    const reviewStatus = review?.status ?? statusForReview(row, result, review);
    return { row, result, review, imagePresent, reviewStatus };
  };

  const states = queue.map(rowState);
  const reviseRows = states
    .filter((state) => state.reviewStatus === "revise")
    .map((state) => state.row);
  if (reviseRows.length) return reviseRows.sort(compareQueueRows).slice(0, count);

  const coveredFamilies = new Set(
    states
      .filter((state) => state.imagePresent && state.result?.status === "generated" && state.reviewStatus !== "reject" && state.reviewStatus !== "revise")
      .map((state) => state.row.family)
  );
  const smokeRows = [];
  for (const family of familyOrder) {
    if (coveredFamilies.has(family)) continue;
    const state = states.find((candidate) => candidate.row.family === family && !candidate.imagePresent);
    if (state) smokeRows.push(state.row);
  }
  if (smokeRows.length) return smokeRows.slice(0, count);

  return states
    .filter((state) => !state.imagePresent)
    .map((state) => state.row)
    .sort(compareQueueRows)
    .slice(0, count);
}

function nextBuiltInItem(row) {
  return {
    questionId: row.questionId,
    grade: row.grade,
    family: row.family,
    needLevel: row.needLevel,
    illustrationKind: row.illustrationKind,
    targetPath: path.relative(rootDir, absoluteImagePath(row)),
    importCommand: `node coordination/content-qa/mainland-pep-primary-question-illustrations-v1/generate-question-illustrations.mjs --import-latest --import-question-id ${row.questionId}`,
    prompt: buildBuiltInPrompt(row)
  };
}

async function runQueue(rows) {
  const results = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (cursor < rows.length) {
      const row = rows[cursor];
      cursor += 1;
      if (delayMs > 0) await sleep(delayMs);
      const result = await generateOne(row);
      results.push(result);
      appendJsonl(generationResultsPath, result);
    }
  });
  await Promise.all(workers);
  return results;
}

async function generateOne(row) {
  const imagePath = absoluteImagePath(row);
  fs.mkdirSync(path.dirname(imagePath), { recursive: true });
  const prompt = buildPrompt(row);
  const startedAt = new Date().toISOString();
  try {
    const responseJson = await requestImage(prompt);
    const imageBase64 = responseJson?.data?.[0]?.b64_json;
    if (!imageBase64) throw new Error("OpenAI response did not include data[0].b64_json");
    fs.writeFileSync(imagePath, Buffer.from(imageBase64, "base64"));
    return resultFor(row, {
      status: "generated",
      prompt,
      imagePath: imageRelativePath(row),
      model,
      quality,
      size,
      outputFormat,
      moderation,
      startedAt,
      completedAt: new Date().toISOString(),
      revisedPrompt: responseJson?.data?.[0]?.revised_prompt ?? null
    });
  } catch (error) {
    return resultFor(row, {
      status: "failed",
      prompt,
      imagePath: imageRelativePath(row),
      model,
      quality,
      size,
      outputFormat,
      moderation,
      startedAt,
      completedAt: new Date().toISOString(),
      error: redact(String(error?.message ?? error))
    });
  }
}

async function requestImage(prompt) {
  let lastError = null;
  for (let attempt = 1; attempt <= maxRetries + 1; attempt += 1) {
    try {
      const requestBody = {
        model,
        prompt,
        n: 1,
        size,
        quality,
        moderation
      };
      if (outputFormat !== "png") requestBody.output_format = outputFormat;

      const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });

      const text = await response.text();
      let json = {};
      try {
        json = text ? JSON.parse(text) : {};
      } catch {
        json = { raw: text.slice(0, 500) };
      }

      if (response.ok) return json;
      const message = json?.error?.message ?? response.statusText ?? "OpenAI image generation failed";
      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt > maxRetries) {
        throw new Error(`HTTP ${response.status}: ${message}`);
      }
      lastError = new Error(`HTTP ${response.status}: ${message}`);
      await sleep(backoffMs(attempt));
    } catch (error) {
      lastError = error;
      if (attempt > maxRetries) break;
      await sleep(backoffMs(attempt));
    }
  }
  throw lastError;
}

function importBuiltInImage(questionId, sourcePath) {
  const row = queue.find((candidate) => candidate.questionId === questionId);
  if (!row) throw new Error(`Question not found in queue: ${questionId}`);
  if (!fs.existsSync(sourcePath)) throw new Error(`Import source not found: ${sourcePath}`);
  const targetPath = absoluteImagePath(row);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const replacement = fs.existsSync(targetPath) ? rotateExistingCandidate(targetPath) : null;
  fs.copyFileSync(sourcePath, targetPath);
  const now = new Date().toISOString();
  return resultFor(row, {
    status: "generated",
    provider: "codex-built-in-image-gen",
    prompt: buildBuiltInPrompt(row),
    imagePath: imageRelativePath(row),
    model,
    quality,
    size,
    outputFormat,
    moderation,
    startedAt: now,
    completedAt: now,
    sourcePath: sourcePath.replace(process.env.HOME ?? "", "$HOME"),
    ...(replacement ? { replacement } : {})
  });
}

function rotateExistingCandidate(targetPath) {
  const extension = path.extname(targetPath);
  const basename = path.basename(targetPath, extension);
  const directory = path.dirname(targetPath);
  let index = 1;
  let archivePath = path.join(directory, `${basename}-v${index}${extension}`);
  while (fs.existsSync(archivePath)) {
    index += 1;
    archivePath = path.join(directory, `${basename}-v${index}${extension}`);
  }
  fs.renameSync(targetPath, archivePath);
  return {
    previousImagePath: path.relative(outputRoot, archivePath).replaceAll(path.sep, "/"),
    replacedAt: new Date().toISOString()
  };
}

function findLatestBuiltInImage() {
  const codexHome = process.env.CODEX_HOME ?? path.join(process.env.HOME ?? "", ".codex");
  const generatedRoot = path.join(codexHome, "generated_images");
  if (!fs.existsSync(generatedRoot)) throw new Error(`Codex generated image folder not found: ${generatedRoot}`);
  const candidates = [];
  scanImages(generatedRoot, candidates);
  if (!candidates.length) throw new Error(`No generated PNG/JPEG/WebP files found under ${generatedRoot}`);
  candidates.sort((left, right) => right.mtimeMs - left.mtimeMs);
  return candidates[0].filePath;
}

function scanImages(directory, out) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      scanImages(entryPath, out);
    } else if (entry.isFile() && /\.(png|jpe?g|webp)$/i.test(entry.name)) {
      const stat = fs.statSync(entryPath);
      out.push({ filePath: entryPath, mtimeMs: stat.mtimeMs });
    }
  }
}

function buildPrompt(row) {
  const kindInstruction = kindInstructions[row.illustrationKind] ?? "Create a clear educational math support illustration with no answer text.";
  return [
    "为中国大陆人教版小学数学题目生成一张题目插图。",
    "",
    `题目ID：${row.questionId}`,
    `年级：${row.grade}`,
    `主题：${row.topicZhHans ?? row.family}`,
    `插图类型：${row.illustrationKind}`,
    `题干：${row.promptZhHans}`,
    "",
    row.imageBriefZhHans,
    "",
    "统一风格：原创、儿童友好、现代数学教具风格、浅色或白色背景、清晰留白、适合放在题目旁边。",
    "禁止：不要教材页截图，不要练习册页面，不要品牌标识，不要水印，不要出现答案，不要把题目完整抄进画面。",
    "数学可靠性：精确数字、公式、坐标、角度、答案选项和最终答案后续由程序或题目文字承载；图片只做理解支架，并预留空白标注区域。",
    `本题类型指引：${kindInstruction}`,
    "输出：一张干净的 PNG 风格教育插图，单图，无边框，无多页排版。"
  ].join("\n");
}

function buildBuiltInPrompt(row) {
  const kindInstruction = kindInstructions[row.illustrationKind] ?? "Create a clear educational math support illustration with no answer text.";
  return [
    "Use case: scientific-educational",
    "Asset type: Mainland PEP primary math question illustration candidate",
    `Question ID: ${row.questionId}`,
    `Grade: ${row.grade}`,
    `Topic: ${row.topicZhHans ?? row.family}`,
    `Illustration kind: ${row.illustrationKind}`,
    `Question prompt for context only: ${row.promptZhHans}`,
    "",
    "Primary request: Create one original child-friendly support illustration for this primary math question. The image should help a young learner understand the situation or representation, but it must not reveal the final answer.",
    "",
    "Scene/backdrop: clean white or very light classroom tabletop, simple educational manipulative style, generous blank space for later deterministic overlays.",
    `Math representation guidance: ${kindInstruction}`,
    "Math constraints: Do not write equations, final answers, answer choices, exact numeric labels, coordinate labels, degree labels, fraction answers, or the full question text inside the image. If exact numbers are needed, leave blank label boxes or open space for later deterministic overlay. Avoid countable objects that conflict with the question values.",
    "Style: original modern educational illustration, soft colors, crisp edges, no clutter, suitable for Chinese primary school students.",
    "Avoid: textbook screenshots, workbook pages, publisher marks, brand logos, watermarks, copied source layouts, visible digits, Chinese text, English text, final answer text, photorealistic hands.",
    "",
    `Source brief: ${row.imageBriefZhHans}`
  ].join("\n");
}

function resultFor(row, extra) {
  return {
    questionId: row.questionId,
    grade: row.grade,
    family: row.family,
    needLevel: row.needLevel,
    illustrationKind: row.illustrationKind,
    priority: row.priority,
    promptZhHans: row.promptZhHans,
    imageBriefZhHans: row.imageBriefZhHans,
    ...extra
  };
}

function absoluteImagePath(row) {
  return path.join(outputRoot, imageRelativePath(row));
}

function imageRelativePath(row) {
  return path.join("candidates", row.grade, row.family, `${row.questionId}.${outputFormat}`).replaceAll(path.sep, "/");
}

function readCompletedResults(filePath) {
  return new Set(readResultRows(filePath)
    .filter((row) => row.status === "generated" || row.status === "existing")
    .map((row) => row.questionId));
}

function readResultRows(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function readManualReviewById() {
  if (!fs.existsSync(manualReviewPath)) return new Map();
  const lines = fs.readFileSync(manualReviewPath, "utf8").split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return new Map();
  const headers = parseCsvLine(lines[0]);
  const byId = new Map();
  for (const line of lines.slice(1)) {
    const values = parseCsvLine(line);
    const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
    if (row.questionId) byId.set(row.questionId, row);
  }
  return byId;
}

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (quoted && char === '"' && next === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (!quoted && char === ",") {
      values.push(value);
      value = "";
    } else {
      value += char;
    }
  }
  values.push(value);
  return values;
}

function mergeResultRows(existingRows, newRows) {
  const byId = new Map();
  for (const row of existingRows) byId.set(row.questionId, row);
  for (const row of newRows) byId.set(row.questionId, row);
  return Array.from(byId.values()).sort(compareQueueRows);
}

function writeReviewArtifacts({ rows, resultRows, dryRun: isDryRun }) {
  const resultById = new Map(resultRows.map((row) => [row.questionId, row]));
  writeManualReview(rows, resultById);
  writeValidationReport(rows, resultById, isDryRun);
  writeIndexMd(rows, resultById, isDryRun);
  writeIndexHtml(rows, resultById, isDryRun);
}

function writeManualReview(rows, resultById) {
  const existingReviewById = readManualReviewById();
  const headers = [
    "questionId",
    "status",
    "decision",
    "reviewNotes",
    "grade",
    "family",
    "needLevel",
    "illustrationKind",
    "priority",
    "imagePath",
    "promptZhHans",
    "imageBriefZhHans"
  ];
  const lines = [
    headers.join(","),
    ...rows.map((row) => {
      const result = resultById.get(row.questionId);
      const existing = existingReviewById.get(row.questionId);
      const status = statusForReview(row, result, existing);
      const values = {
        questionId: row.questionId,
        status,
        decision: existing?.decision ?? "",
        reviewNotes: existing?.reviewNotes ?? "",
        grade: row.grade,
        family: row.family,
        needLevel: row.needLevel,
        illustrationKind: row.illustrationKind,
        priority: row.priority,
        imagePath: result?.imagePath ?? imageRelativePath(row),
        promptZhHans: row.promptZhHans,
        imageBriefZhHans: row.imageBriefZhHans
      };
      return headers.map((header) => csvEscape(values[header])).join(",");
    })
  ];
  fs.writeFileSync(manualReviewPath, lines.join("\n") + "\n", "utf8");
}

function statusForReview(row, result, existing) {
  if (existing && ["approved", "revise", "reject"].includes(existing.status)) return existing.status;
  if (result?.status === "generated") return "pending";
  if (result?.status === "dry-run") return "dry-run";
  if (result?.status === "failed") return "failed";
  if (fs.existsSync(absoluteImagePath(row))) return "pending";
  return "missing";
}

function writeValidationReport(rows, resultById, isDryRun) {
  const reviewById = readManualReviewById();
  const imageRows = rows.map((row) => ({
    ...row,
    imagePath: absoluteImagePath(row),
    result: resultById.get(row.questionId),
    review: reviewById.get(row.questionId)
  }));
  const imagesPresent = imageRows.filter((row) => fs.existsSync(row.imagePath)).length;
  const generated = imageRows.filter((row) => row.result?.status === "generated").length;
  const failed = imageRows.filter((row) => row.result?.status === "failed").length;
  const dryRunCount = imageRows.filter((row) => row.result?.status === "dry-run").length;
  const counts = countDimensions(rows);
  const report = {
    generatedAt: new Date().toISOString(),
    mode,
    dryRun: isDryRun,
    model,
    quality,
    size,
    outputFormat,
    moderation,
    queuePath: path.relative(rootDir, queuePath),
    outputRoot: path.relative(rootDir, outputRoot),
    selectedQuestions: rows.length,
    imagesPresent,
    generated,
    failed,
    dryRunCount,
    missingImages: rows.length - imagesPresent,
    counts,
    reviewStatusCounts: countBy(imageRows, (row) => statusForReview(row, row.result, row.review)),
    checks: [
      { name: "selectedRowsHaveUniqueQuestionIds", status: new Set(rows.map((row) => row.questionId)).size === rows.length ? "PASS" : "FAIL" },
      { name: "manualReviewHasAllowedStatuses", status: manualReviewStatusesAreAllowed(imageRows) ? "PASS" : "FAIL", allowedStatuses: ["pending", "approved", "revise", "reject", "dry-run", "failed", "missing"] },
      { name: "fullQueueNeedLevelTotals", status: queueNeedLevelTotalsAreStable() ? "PASS" : "FAIL", expected: { core: 700, recommended: 400, optional: 100 } },
      { name: "fullQueueCount", status: queue.length === 1200 ? "PASS" : "FAIL", expected: 1200, actual: queue.length }
    ],
    failedQuestionIds: imageRows.filter((row) => row.result?.status === "failed").map((row) => row.questionId),
    missingImageQuestionIds: imageRows.filter((row) => !fs.existsSync(row.imagePath)).map((row) => row.questionId)
  };
  fs.writeFileSync(validationReportPath, JSON.stringify(report, null, 2) + "\n", "utf8");
}

function manualReviewStatusesAreAllowed(imageRows) {
  const allowed = new Set(["pending", "approved", "revise", "reject", "dry-run", "failed", "missing"]);
  return imageRows.every((row) => allowed.has(statusForReview(row, row.result, row.review)));
}

function writeIndexMd(rows, resultById, isDryRun) {
  const groups = groupBy(rows, (row) => `${row.grade} / ${row.family}`);
  const sections = Object.entries(groups).map(([group, groupRows]) => {
    const body = groupRows.map((row) => {
      const result = resultById.get(row.questionId);
      const relPath = result?.imagePath ?? imageRelativePath(row);
      const imageExists = fs.existsSync(path.join(outputRoot, relPath));
      const imageLine = imageExists ? `![${row.questionId}](${relPath})` : `Image pending: \`${relPath}\``;
      return [
        `### ${row.questionId}`,
        "",
        imageLine,
        "",
        `- Status: \`${result?.status ?? "missing"}\``,
        `- Grade/family: \`${row.grade}\` / \`${row.family}\``,
        `- Need/kind: \`${row.needLevel}\` / \`${row.illustrationKind}\``,
        `- Prompt: ${row.promptZhHans}`
      ].join("\n");
    }).join("\n\n");
    return `## ${group}\n\n${body}`;
  }).join("\n\n");

  fs.writeFileSync(indexMdPath, [
    "# Mainland PEP Primary Question Illustrations V1",
    "",
    `- Generated at: ${new Date().toISOString()}`,
    `- Mode: \`${mode}\``,
    `- Dry run: \`${isDryRun}\``,
    `- Model: \`${model}\``,
    `- Quality/size: \`${quality}\` / \`${size}\``,
    `- Source queue: \`${path.relative(rootDir, queuePath)}\``,
    `- Selected questions: ${rows.length}`,
    "",
    "Review decisions in `manual-review.csv` should use `pending`, `approved`, `revise`, or `reject`.",
    "",
    sections
  ].join("\n") + "\n", "utf8");
}

function writeIndexHtml(rows, resultById, isDryRun) {
  const cards = rows.map((row) => {
    const result = resultById.get(row.questionId);
    const relPath = result?.imagePath ?? imageRelativePath(row);
    const imageExists = fs.existsSync(path.join(outputRoot, relPath));
    const media = imageExists
      ? `<img src="${escapeHtml(relPath)}" alt="${escapeHtml(row.questionId)}">`
      : `<div class="placeholder">Image pending</div>`;
    return `<article class="card">
      ${media}
      <h2>${escapeHtml(row.questionId)}</h2>
      <p><strong>${escapeHtml(row.grade)}</strong> / ${escapeHtml(row.family)} / ${escapeHtml(row.needLevel)} / ${escapeHtml(row.illustrationKind)}</p>
      <p>${escapeHtml(row.promptZhHans)}</p>
      <p class="status">${escapeHtml(result?.status ?? "missing")}</p>
    </article>`;
  }).join("\n");

  fs.writeFileSync(indexHtmlPath, `<!doctype html>
<html lang="zh-Hans">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mainland PEP Primary Question Illustrations V1</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 24px; background: #f8fafc; color: #172033; }
    header { max-width: 1100px; margin: 0 auto 24px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; max-width: 1400px; margin: 0 auto; }
    .card { background: white; border: 1px solid #d8dee9; border-radius: 8px; padding: 12px; }
    img, .placeholder { width: 100%; aspect-ratio: 1 / 1; object-fit: cover; border-radius: 6px; background: #e2e8f0; display: grid; place-items: center; color: #64748b; }
    h1 { margin-bottom: 8px; }
    h2 { font-size: 14px; margin: 10px 0 6px; }
    p { font-size: 12px; line-height: 1.45; }
    .status { color: #2563eb; font-weight: 700; }
  </style>
</head>
<body>
  <header>
    <h1>Mainland PEP Primary Question Illustrations V1</h1>
    <p>Mode: ${escapeHtml(mode)}; dry run: ${escapeHtml(String(isDryRun))}; selected questions: ${rows.length}; model: ${escapeHtml(model)}.</p>
  </header>
  <main class="grid">
    ${cards}
  </main>
</body>
</html>
`, "utf8");
}

function writeJsonl(filePath, rows) {
  fs.writeFileSync(filePath, rows.map((row) => JSON.stringify(row)).join("\n") + "\n", "utf8");
}

function appendJsonl(filePath, row) {
  fs.appendFileSync(filePath, JSON.stringify(row) + "\n", "utf8");
}

function countDimensions(rows) {
  return {
    needLevel: countBy(rows, (row) => row.needLevel),
    grade: countBy(rows, (row) => row.grade),
    family: countBy(rows, (row) => row.family),
    illustrationKind: countBy(rows, (row) => row.illustrationKind)
  };
}

function countBy(rows, keyFn) {
  return rows.reduce((counts, row) => {
    const key = keyFn(row);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function groupBy(rows, keyFn) {
  return rows.reduce((groups, row) => {
    const key = keyFn(row);
    groups[key] ??= [];
    groups[key].push(row);
    return groups;
  }, {});
}

function queueNeedLevelTotalsAreStable() {
  const counts = countBy(queue, (row) => row.needLevel);
  return counts.core === 700 && counts.recommended === 400 && counts.optional === 100;
}

function summaryFor({ selectedRows, resultRows, dryRun: isDryRun }) {
  const statusCounts = countBy(resultRows, (row) => row.status);
  return {
    mode,
    dryRun: isDryRun,
    selectedQuestions: selectedRows.length,
    statusCounts,
    outputRoot: path.relative(rootDir, outputRoot),
    manualReview: path.relative(rootDir, manualReviewPath),
    validationReport: path.relative(rootDir, validationReportPath),
    indexMd: path.relative(rootDir, indexMdPath),
    indexHtml: path.relative(rootDir, indexHtmlPath)
  };
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function redact(value) {
  return value
    .replace(/sk-[A-Za-z0-9_-]{12,}/g, "sk-REDACTED")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer REDACTED");
}

function backoffMs(attempt) {
  return Math.min(60_000, 1000 * 2 ** (attempt - 1));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
