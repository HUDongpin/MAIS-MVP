#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../../..");
const outputRoot = scriptDir;
const queueJsonPath = path.join(outputRoot, "generation-queue.json");
const candidateManifestPath = path.join(outputRoot, "candidate-manifest.json");
const generationResultsPath = path.join(outputRoot, "generation-results.jsonl");
const dryRunResultsPath = path.join(outputRoot, "dry-run-results.jsonl");
const validationReportPath = path.join(outputRoot, "validation-report.json");
const manualReviewPath = path.join(outputRoot, "manual-review.csv");
const reviewHtmlPath = path.join(outputRoot, "review/index.html");

const args = parseArgs(process.argv.slice(2));
const dryRun = Boolean(args["dry-run"]);
const mode = String(args.mode ?? "smoke");
const tier = args.tier ? String(args.tier) : null;
const limit = args.limit === undefined ? null : nonNegativeInteger(args.limit, 0);
const force = Boolean(args.force);
const resume = Boolean(args.resume);
const skipExisting = args["skip-existing"] === undefined ? true : String(args["skip-existing"]) !== "false";
const sequential = Boolean(args.sequential);
const model = String(process.env.GPT_IMAGE_MODEL ?? args.model ?? "gpt-image-2");
const size = String(process.env.GPT_IMAGE_SIZE ?? args.size ?? "1024x1024");
const quality = String(process.env.GPT_IMAGE_QUALITY ?? args.quality ?? "medium");
const outputFormat = String(process.env.GPT_IMAGE_OUTPUT_FORMAT ?? args["output-format"] ?? "png");
const moderation = String(process.env.GPT_IMAGE_MODERATION ?? args.moderation ?? "auto");
const concurrency = positiveInteger(process.env.GPT_IMAGE_CONCURRENCY ?? args.concurrency, 1);
const maxRetries = positiveInteger(process.env.GPT_IMAGE_MAX_RETRIES ?? args.retries, 4);
const delayMs = nonNegativeInteger(process.env.GPT_IMAGE_DELAY_MS ?? args.delay, 0);
const importQuestionId = args["import-question-id"] ? String(args["import-question-id"]) : null;
const importSource = args["import-source"] ? resolveInputPath(String(args["import-source"])) : null;
const importLatest = Boolean(args["import-latest"]);
const nextBuiltIn = Boolean(args["next-built-in"]);
const builtInStatus = Boolean(args["built-in-status"]);
const rebuildReview = Boolean(args["rebuild-review"]);
const nextCount = positiveInteger(args.count, 30);

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

const allowedTiers = new Set(["A_required", "B_strong_recommended"]);
const generatedStatuses = new Set(["generated-pending-review", "approved"]);
let manualReviewCache = null;

const queuePackage = readJson(queueJsonPath, "Run build-generation-queue.mjs before generation.");
const manifest = readJson(candidateManifestPath, "Run build-generation-queue.mjs before generation.");
validateInputs(queuePackage, manifest);

const selectedRows = applyLimit(selectRows(manifest.assets, { mode, tier }), limit, sequential);

if (builtInStatus) {
  console.log(JSON.stringify(builtInStatusSummary(), null, 2));
  process.exit(0);
}

if (nextBuiltIn) {
  console.log(JSON.stringify(nextBuiltInBatch(nextCount), null, 2));
  process.exit(0);
}

if (rebuildReview) {
  syncManifestWithFiles();
  writeManifest(manifest);
  writeReviewArtifacts(manifest);
  const report = validationReportFor({
    manifest,
    selectedRows: manifest.assets,
    resultRows: readResultRows(generationResultsPath),
    dryRun: false,
    workRows: manifest.assets
  });
  fs.writeFileSync(validationReportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report.summary, null, 2));
  process.exit(0);
}

if (importQuestionId || importSource || importLatest) {
  if (!importQuestionId || (!importSource && !importLatest)) {
    throw new Error("Import mode requires --import-question-id with either --import-source or --import-latest.");
  }
  const sourcePath = importLatest ? findLatestBuiltInImage() : importSource;
  const importResult = importBuiltInImage(importQuestionId, sourcePath);
  applyResultToManifest(importQuestionId, importResult);
  appendJsonl(generationResultsPath, importResult);
  writeManifest(manifest);
  writeReviewArtifacts(manifest);
  const report = validationReportFor({
    manifest,
    selectedRows: [manifest.assets.find((asset) => asset.questionId === importQuestionId)].filter(Boolean),
    resultRows: [importResult],
    dryRun: false,
    workRows: [manifest.assets.find((asset) => asset.questionId === importQuestionId)].filter(Boolean)
  });
  fs.writeFileSync(validationReportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({
    imported: importResult.questionId,
    imagePath: importResult.imagePath,
    sourcePath: importResult.sourcePath,
    replacement: importResult.replacement ?? null,
    candidateManifest: path.relative(rootDir, candidateManifestPath),
    manualReview: path.relative(rootDir, manualReviewPath),
    validationReport: path.relative(rootDir, validationReportPath)
  }, null, 2));
  process.exit(0);
}

if (dryRun) {
  const dryRunRows = selectedRows.map((asset) => resultFor(asset, {
    status: "dry-run",
    assetStatus: asset.assetStatus,
    reviewStatus: asset.reviewStatus,
    model,
    size,
    quality,
    outputFormat,
    moderation,
    prompt: asset.prompt,
    imagePath: asset.imagePath
  }));
  writeJsonl(dryRunResultsPath, dryRunRows);
  const report = validationReportFor({
    manifest,
    selectedRows,
    resultRows: dryRunRows,
    dryRun: true,
    workRows: selectedRows
  });
  fs.writeFileSync(validationReportPath, `${JSON.stringify(report, null, 2)}\n`);
  writeReviewArtifacts(manifest);
  console.log(JSON.stringify(report.summary, null, 2));
  process.exit(0);
}

if (!process.env.OPENAI_API_KEY) {
  console.error("Blocked: OPENAI_API_KEY is missing. Set an owner-approved key in the shell environment before running GPT Image2 generation.");
  process.exit(2);
}

const workRows = selectedRows.filter((asset) => shouldGenerate(asset));
const runResults = await runQueue(workRows);
const report = validationReportFor({
  manifest,
  selectedRows,
  resultRows: runResults,
  dryRun: false,
  workRows
});

manifest.metadata.lastGenerationRun = {
  completedAt: new Date().toISOString(),
  mode: tier ? `tier:${tier}` : mode,
  selected: selectedRows.length,
  attempted: workRows.length,
  generated: runResults.filter((row) => row.status === "generated").length,
  failed: runResults.filter((row) => row.status === "failed").length,
  model,
  size,
  quality,
  outputFormat,
  moderation,
  concurrency
};

writeManifest(manifest);
fs.writeFileSync(validationReportPath, `${JSON.stringify(report, null, 2)}\n`);
writeReviewArtifacts(manifest);
console.log(JSON.stringify(report.summary, null, 2));

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

function positiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function nonNegativeInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function readJson(filePath, hint) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${filePath} not found. ${hint}`);
  }
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function resolveInputPath(inputPath) {
  if (inputPath === "~") return process.env.HOME ?? inputPath;
  if (inputPath.startsWith("~/")) return path.join(process.env.HOME ?? "", inputPath.slice(2));
  return path.resolve(rootDir, inputPath);
}

function validateInputs(queuePackage, manifestPackage) {
  if (!Array.isArray(queuePackage.queue)) {
    throw new Error("generation-queue.json must contain a queue array.");
  }
  if (!Array.isArray(manifestPackage.assets)) {
    throw new Error("candidate-manifest.json must contain an assets array.");
  }
  const queueIds = new Set(queuePackage.queue.map((row) => row.questionId));
  if (queueIds.size !== 1145 || manifestPackage.assets.length !== 1145) {
    throw new Error(`Expected 1145 queue and manifest rows; got queue=${queueIds.size}, manifest=${manifestPackage.assets.length}.`);
  }
  for (const asset of manifestPackage.assets) {
    if (!queueIds.has(asset.questionId)) {
      throw new Error(`Manifest asset is not in queue: ${asset.questionId}`);
    }
    if (!allowedTiers.has(asset.needTier)) {
      throw new Error(`Unsupported needTier in manifest: ${asset.needTier}`);
    }
    if (!asset.prompt || !asset.imagePath) {
      throw new Error(`Manifest asset ${asset.questionId} is missing prompt or imagePath.`);
    }
  }
}

function selectRows(rows, { mode: selectedMode, tier: selectedTier }) {
  if (selectedTier) {
    if (!allowedTiers.has(selectedTier)) {
      throw new Error(`Unsupported --tier ${selectedTier}. Use A_required or B_strong_recommended.`);
    }
    return rows.filter((asset) => asset.needTier === selectedTier);
  }
  if (selectedMode === "full") return rows;
  if (selectedMode === "smoke") return balancedLimit(rows, Math.min(30, rows.length));
  if (selectedMode === "core" || selectedMode === "A_required") {
    return rows.filter((asset) => asset.needTier === "A_required");
  }
  if (selectedMode === "recommended" || selectedMode === "B_strong_recommended") {
    return rows.filter((asset) => asset.needTier === "B_strong_recommended");
  }
  throw new Error(`Unknown --mode ${selectedMode}. Use smoke, full, core, recommended, A_required, or B_strong_recommended.`);
}

function applyLimit(rows, selectedLimit, keepSequentialOrder) {
  if (!selectedLimit || rows.length <= selectedLimit) return rows;
  if (keepSequentialOrder) return rows.slice(0, selectedLimit);
  return balancedLimit(rows, selectedLimit);
}

function balancedLimit(rows, selectedLimit) {
  const groups = new Map();
  for (const category of categoryOrder) groups.set(category, []);
  for (const row of rows) {
    if (!groups.has(row.visualCategory)) groups.set(row.visualCategory, []);
    groups.get(row.visualCategory).push(row);
  }
  const orderedGroups = [...groups.entries()]
    .filter(([, group]) => group.length > 0)
    .sort((left, right) => categoryIndex(left[0]) - categoryIndex(right[0]));
  const selected = [];
  let depth = 0;
  while (selected.length < selectedLimit) {
    let added = false;
    for (const [, group] of orderedGroups) {
      if (group[depth] && selected.length < selectedLimit) {
        selected.push(group[depth]);
        added = true;
      }
    }
    if (!added) break;
    depth += 1;
  }
  return selected;
}

function categoryIndex(category) {
  const index = categoryOrder.indexOf(category);
  return index === -1 ? 999 : index;
}

function shouldGenerate(asset) {
  if (force) return true;
  if (resume && generatedStatuses.has(asset.assetStatus)) return false;
  if (skipExisting && fs.existsSync(path.join(outputRoot, asset.imagePath))) return false;
  return true;
}

function builtInStatusSummary() {
  syncManifestWithFiles();
  const tierCounts = countBy(manifest.assets, "needTier");
  const assetStatusCounts = countBy(manifest.assets, "assetStatus");
  const reviewStatusCounts = countBy(manifest.assets, "reviewStatus");
  const imagePresentCount = manifest.assets.filter((asset) => imagePresent(asset)).length;
  const categoryCoverage = {};
  for (const category of categoryOrder) {
    const rows = manifest.assets.filter((asset) => asset.visualCategory === category);
    categoryCoverage[category] = {
      total: rows.length,
      imagesPresent: rows.filter((asset) => imagePresent(asset)).length,
      generatedPendingReview: rows.filter((asset) => asset.assetStatus === "generated-pending-review").length,
      approved: rows.filter((asset) => asset.assetStatus === "approved").length,
      notGenerated: rows.filter((asset) => asset.assetStatus === "not-generated").length,
      generationFailed: rows.filter((asset) => asset.assetStatus === "generation-failed").length,
      needsRegeneration: rows.filter((asset) => needsRegeneration(asset)).length,
      A_required: rows.filter((asset) => asset.needTier === "A_required").length,
      B_strong_recommended: rows.filter((asset) => asset.needTier === "B_strong_recommended").length
    };
  }
  return {
    packageName: manifest.metadata?.packageName ?? "hjb-primary-question-illustrations-v1",
    route: "codex-built-in-image-gen",
    generatedAt: new Date().toISOString(),
    totals: {
      queue: manifest.assets.length,
      A_required: tierCounts.A_required ?? 0,
      B_strong_recommended: tierCounts.B_strong_recommended ?? 0,
      imagesPresent: imagePresentCount,
      pendingGeneration: manifest.assets.length - imagePresentCount,
      failed: assetStatusCounts["generation-failed"] ?? 0,
      needsRegeneration: manifest.assets.filter((asset) => needsRegeneration(asset)).length
    },
    assetStatusCounts,
    reviewStatusCounts,
    categoryCoverage,
    nextBuiltInCommand: "node coordination/content-qa/hjb-primary-question-illustrations-v1/generate-gpt-image2-candidates.mjs --next-built-in --count 30"
  };
}

function nextBuiltInBatch(count) {
  syncManifestWithFiles();
  const rows = nextBuiltInRows(count);
  return {
    route: "codex-built-in-image-gen",
    generatedAt: new Date().toISOString(),
    requestedCount: count,
    returnedCount: rows.length,
    batchPolicy: "needs-regeneration first, then A_required 30-image category smoke, then remaining A_required, then B_strong_recommended",
    items: rows.map(nextBuiltInItem)
  };
}

function nextBuiltInRows(count) {
  const excludedIds = new Set();
  const selected = [];
  const addRows = (rows, max = count) => {
    for (const asset of rows) {
      if (selected.length >= max) break;
      if (excludedIds.has(asset.questionId)) continue;
      excludedIds.add(asset.questionId);
      selected.push(asset);
    }
  };

  addRows(
    manifest.assets
      .filter((asset) => needsRegeneration(asset) || asset.assetStatus === "generation-failed")
      .sort(compareAssets)
  );
  if (selected.length >= count) return selected.slice(0, count);

  addRows(aRequiredSmokeGapRows(), count);
  if (selected.length >= count) return selected.slice(0, count);

  addRows(
    manifest.assets
      .filter((asset) => asset.needTier === "A_required" && !imagePresent(asset))
      .sort(compareAssets),
    count
  );
  if (selected.length >= count) return selected.slice(0, count);

  addRows(
    manifest.assets
      .filter((asset) => asset.needTier === "B_strong_recommended" && !imagePresent(asset))
      .sort(compareAssets),
    count
  );
  return selected.slice(0, count);
}

function aRequiredSmokeGapRows() {
  const smokeRows = [];
  for (const category of categoryOrder) {
    const categoryRows = manifest.assets
      .filter((asset) => asset.needTier === "A_required" && asset.visualCategory === category)
      .sort(compareAssets);
    const presentCount = categoryRows.filter((asset) => imagePresent(asset) && !needsRegeneration(asset)).length;
    const needed = Math.max(0, 2 - presentCount);
    if (!needed) continue;
    smokeRows.push(...categoryRows.filter((asset) => !imagePresent(asset)).slice(0, needed));
  }
  return smokeRows;
}

function nextBuiltInItem(asset) {
  return {
    questionId: asset.questionId,
    grade: asset.grade,
    volume: asset.volume,
    unitTitle: asset.unitTitle,
    needTier: asset.needTier,
    visualCategory: asset.visualCategory,
    family: asset.family,
    illustrationKind: asset.illustrationKind,
    targetPath: path.relative(rootDir, path.join(outputRoot, asset.imagePath)),
    importCommand: `node coordination/content-qa/hjb-primary-question-illustrations-v1/generate-gpt-image2-candidates.mjs --import-latest --import-question-id ${asset.questionId}`,
    prompt: buildBuiltInPrompt(asset)
  };
}

function buildBuiltInPrompt(asset) {
  return [
    "Use case: scientific-educational",
    "Asset type: Shanghai Education Publishing House primary math question illustration candidate",
    `Question ID: ${asset.questionId}`,
    `Grade: ${asset.grade}`,
    `Volume: ${asset.volume}`,
    `Unit: ${asset.unitTitle}`,
    `Need tier: ${asset.needTier}`,
    `Visual category: ${asset.visualCategory}`,
    `Illustration kind: ${asset.illustrationKind}`,
    `Question prompt for context only: ${asset.promptZhHans}`,
    "",
    "Primary request: Create one original, child-friendly support illustration for this primary math question. The image should help a young learner understand the mathematical situation or representation, but it must not reveal the final answer.",
    "",
    "Scene/backdrop: clean white or very light classroom-learning background, simple educational manipulative style, generous blank space for later deterministic overlays.",
    `Math representation guidance: ${asset.imageBriefZhHans}`,
    "Math constraints: Do not write equations, final answers, answer choices, exact numeric labels, coordinate labels, degree labels, fraction answers, price labels, clock numerals, axis labels, or the full question text inside the image. If exact labels or numbers are needed, leave blank label boxes or open space for later deterministic SVG/Canvas overlay.",
    "Style: original modern educational illustration, soft colors, crisp edges, uncluttered, suitable for mainland China primary school students.",
    "Avoid: textbook screenshots, workbook pages, publisher marks, brand logos, watermarks, copied source layouts, visible digits, Chinese text, English text, final answer text, photorealistic hands.",
    "",
    "Source prompt policy from the audit package:",
    asset.prompt
  ].join("\n");
}

function compareAssets(left, right) {
  return (
    tierIndex(left.needTier) - tierIndex(right.needTier) ||
    categoryIndex(left.visualCategory) - categoryIndex(right.visualCategory) ||
    gradeIndex(left.grade) - gradeIndex(right.grade) ||
    left.questionId.localeCompare(right.questionId)
  );
}

function tierIndex(needTier) {
  if (needTier === "A_required") return 1;
  if (needTier === "B_strong_recommended") return 2;
  return 99;
}

function gradeIndex(grade) {
  const match = String(grade ?? "").match(/\d+/);
  return match ? Number.parseInt(match[0], 10) : 99;
}

function needsRegeneration(asset) {
  const manual = readManualReviewById().get(asset.questionId);
  const values = [
    asset.reviewStatus,
    asset.assetStatus,
    manual?.reviewStatus,
    manual?.reviewDecision
  ].filter(Boolean).map((value) => String(value).trim().toLowerCase());
  return values.some((value) => value === "needs-regeneration" || value === "revise");
}

function imagePresent(asset) {
  return fs.existsSync(path.join(outputRoot, asset.imagePath));
}

function syncManifestWithFiles() {
  for (const asset of manifest.assets) {
    const imagePath = path.join(outputRoot, asset.imagePath);
    if (!fs.existsSync(imagePath)) continue;
    const buffer = fs.readFileSync(imagePath);
    asset.bytes = buffer.byteLength;
    asset.pngInfo = inspectPng(buffer);
    if (asset.assetStatus === "not-generated" || asset.assetStatus === "generation-failed") {
      asset.assetStatus = "generated-pending-review";
    }
    if (asset.reviewStatus === "not-generated" || asset.reviewStatus === "not-reviewable") {
      asset.reviewStatus = "pending-review";
    }
  }
}

async function runQueue(rows) {
  const results = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (cursor < rows.length) {
      const asset = rows[cursor];
      cursor += 1;
      if (delayMs > 0) await sleep(delayMs);
      const result = await generateOne(asset);
      results.push(result);
      applyResultToManifest(asset.questionId, result);
      appendJsonl(generationResultsPath, result);
      writeManifest(manifest);
    }
  });
  await Promise.all(workers);
  return results;
}

async function generateOne(asset) {
  const imageAbsPath = path.join(outputRoot, asset.imagePath);
  fs.mkdirSync(path.dirname(imageAbsPath), { recursive: true });
  const startedAt = new Date().toISOString();
  try {
    const responseJson = await requestImage(asset.prompt);
    const imageBuffer = await imageBufferFromResponse(responseJson);
    fs.writeFileSync(imageAbsPath, imageBuffer);
    const pngInfo = outputFormat === "png" ? inspectPng(imageBuffer) : null;
    return resultFor(asset, {
      status: "generated",
      assetStatus: "generated-pending-review",
      reviewStatus: "pending-review",
      model,
      size,
      quality,
      outputFormat,
      moderation,
      prompt: asset.prompt,
      imagePath: asset.imagePath,
      bytes: imageBuffer.byteLength,
      pngInfo,
      startedAt,
      completedAt: new Date().toISOString(),
      revisedPrompt: responseJson?.data?.[0]?.revised_prompt ?? null
    });
  } catch (error) {
    return resultFor(asset, {
      status: "failed",
      assetStatus: "generation-failed",
      reviewStatus: "not-reviewable",
      model,
      size,
      quality,
      outputFormat,
      moderation,
      prompt: asset.prompt,
      imagePath: asset.imagePath,
      startedAt,
      completedAt: new Date().toISOString(),
      error: redact(String(error?.message ?? error))
    });
  }
}

async function requestImage(prompt) {
  let lastError = null;
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model,
          prompt,
          n: 1,
          size,
          quality,
          output_format: outputFormat,
          moderation
        })
      });
      const bodyText = await response.text();
      if (!response.ok) {
        const message = summarizeOpenAIError(response.status, bodyText);
        if (attempt < maxRetries && isRetryableStatus(response.status)) {
          await sleep(backoffMs(attempt));
          lastError = new Error(message);
          continue;
        }
        throw new Error(message);
      }
      return JSON.parse(bodyText);
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        await sleep(backoffMs(attempt));
        continue;
      }
    }
  }
  throw lastError ?? new Error("OpenAI image request failed.");
}

async function imageBufferFromResponse(responseJson) {
  const item = responseJson?.data?.[0];
  if (!item) throw new Error("OpenAI response did not include data[0].");
  if (item.b64_json) return Buffer.from(item.b64_json, "base64");
  if (item.url) {
    const response = await fetch(item.url);
    if (!response.ok) {
      throw new Error(`Could not download generated image URL: HTTP ${response.status}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }
  throw new Error("OpenAI response did not include b64_json or url.");
}

function summarizeOpenAIError(status, bodyText) {
  try {
    const parsed = JSON.parse(bodyText);
    const message = parsed?.error?.message ?? bodyText;
    const type = parsed?.error?.type ? ` (${parsed.error.type})` : "";
    return `OpenAI Images API HTTP ${status}${type}: ${message}`;
  } catch {
    return `OpenAI Images API HTTP ${status}: ${bodyText.slice(0, 500)}`;
  }
}

function isRetryableStatus(status) {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

function backoffMs(attempt) {
  return Math.min(30000, 1000 * 2 ** (attempt - 1));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function inspectPng(buffer) {
  const signature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== signature) {
    return { validPng: false, width: null, height: null };
  }
  return {
    validPng: true,
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

function resultFor(asset, fields) {
  return {
    questionId: asset.questionId,
    grade: asset.grade,
    volume: asset.volume,
    unitTitle: asset.unitTitle,
    needTier: asset.needTier,
    visualCategory: asset.visualCategory,
    needsDeterministicOverlay: asset.needsDeterministicOverlay,
    ...fields
  };
}

function applyResultToManifest(questionId, result) {
  const asset = manifest.assets.find((candidate) => candidate.questionId === questionId);
  if (!asset) throw new Error(`Could not find manifest row for ${questionId}.`);
  asset.model = result.model;
  asset.size = result.size;
  asset.quality = result.quality;
  asset.outputFormat = result.outputFormat;
  asset.moderation = result.moderation;
  asset.assetStatus = result.assetStatus;
  asset.reviewStatus = result.reviewStatus;
  asset.generatedAt = result.status === "generated" ? result.completedAt : null;
  asset.generationError = result.error ?? null;
  asset.revisedPrompt = result.revisedPrompt ?? null;
  asset.provider = result.provider ?? asset.provider ?? null;
  asset.sourcePath = result.sourcePath ?? asset.sourcePath ?? null;
  asset.replacement = result.replacement ?? null;
  asset.bytes = result.bytes ?? null;
  asset.pngInfo = result.pngInfo ?? null;
}

function importBuiltInImage(questionId, sourcePath) {
  const asset = manifest.assets.find((candidate) => candidate.questionId === questionId);
  if (!asset) throw new Error(`Question not found in manifest: ${questionId}`);
  if (!fs.existsSync(sourcePath)) throw new Error(`Import source not found: ${sourcePath}`);
  if (!/\.(png|jpe?g|webp)$/i.test(sourcePath)) {
    throw new Error(`Import source must be PNG, JPEG, or WebP: ${sourcePath}`);
  }
  const targetPath = path.join(outputRoot, asset.imagePath);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const replacement = fs.existsSync(targetPath) ? rotateExistingCandidate(targetPath) : null;
  fs.copyFileSync(sourcePath, targetPath);
  const buffer = fs.readFileSync(targetPath);
  const now = new Date().toISOString();
  return resultFor(asset, {
    status: "generated",
    provider: "codex-built-in-image-gen",
    assetStatus: "generated-pending-review",
    reviewStatus: "pending-review",
    model,
    size,
    quality,
    outputFormat,
    moderation,
    prompt: buildBuiltInPrompt(asset),
    imagePath: asset.imagePath,
    bytes: buffer.byteLength,
    pngInfo: inspectPng(buffer),
    startedAt: now,
    completedAt: now,
    sourcePath: redactHome(sourcePath),
    ...(replacement ? { replacement } : {})
  });
}

function rotateExistingCandidate(targetPath) {
  const extension = path.extname(targetPath) || ".png";
  const basename = path.basename(targetPath, extension);
  const directory = path.dirname(targetPath);
  let version = 1;
  let archivePath = path.join(directory, `${basename}-v${version}${extension}`);
  while (fs.existsSync(archivePath)) {
    version += 1;
    archivePath = path.join(directory, `${basename}-v${version}${extension}`);
  }
  fs.renameSync(targetPath, archivePath);
  return {
    previousImagePath: path.relative(outputRoot, archivePath).replaceAll(path.sep, "/"),
    replacedAt: new Date().toISOString()
  };
}

function findLatestBuiltInImage() {
  const codexHome = process.env.CODEX_HOME || path.join(process.env.HOME ?? "", ".codex");
  const generatedRoot = path.join(codexHome, "generated_images");
  if (!fs.existsSync(generatedRoot)) {
    throw new Error(`Codex generated image folder not found: ${generatedRoot}`);
  }
  const candidates = [];
  scanImages(generatedRoot, candidates);
  if (!candidates.length) {
    throw new Error(`No generated PNG/JPEG/WebP files found under ${generatedRoot}`);
  }
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

function redactHome(filePath) {
  const home = process.env.HOME;
  if (!home) return filePath;
  return filePath.replace(home, "$HOME");
}

function writeManifest(manifestPackage) {
  fs.writeFileSync(candidateManifestPath, `${JSON.stringify(manifestPackage, null, 2)}\n`);
}

function appendJsonl(filePath, row) {
  fs.appendFileSync(filePath, `${JSON.stringify(row)}\n`);
}

function writeJsonl(filePath, rows) {
  fs.writeFileSync(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
}

function readResultRows(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function validationReportFor({ manifest, selectedRows, resultRows, dryRun, workRows }) {
  const allAssets = manifest.assets;
  const statusCounts = countBy(allAssets, "assetStatus");
  const reviewCounts = countBy(allAssets, "reviewStatus");
  const resultCounts = countBy(resultRows, "status");
  const generatedAssets = allAssets.filter((asset) => asset.assetStatus === "generated-pending-review" || asset.assetStatus === "approved");
  const missingGeneratedImages = generatedAssets.filter((asset) => !fs.existsSync(path.join(outputRoot, asset.imagePath)));
  const pngFailures = generatedAssets.filter((asset) => asset.pngInfo && (!asset.pngInfo.validPng || asset.pngInfo.width !== asset.pngInfo.height));
  const checks = [
    check("manifest_total_1145", allAssets.length === 1145, { actual: allAssets.length, expected: 1145 }),
    check("A_queue_607", countBy(allAssets, "needTier").A_required === 607, { actual: countBy(allAssets, "needTier").A_required ?? 0, expected: 607 }),
    check("B_queue_538", countBy(allAssets, "needTier").B_strong_recommended === 538, { actual: countBy(allAssets, "needTier").B_strong_recommended ?? 0, expected: 538 }),
    check("selected_rows_have_prompts", selectedRows.every((asset) => Boolean(asset.prompt && asset.imagePath)), { selected: selectedRows.length }),
    check("generated_images_exist", missingGeneratedImages.length === 0, { missingGeneratedImages: missingGeneratedImages.map((asset) => asset.questionId) }),
    check("generated_pngs_valid_square", pngFailures.length === 0, { pngFailures: pngFailures.map((asset) => ({ questionId: asset.questionId, pngInfo: asset.pngInfo })) })
  ];
  return {
    generatedAt: new Date().toISOString(),
    dryRun,
    options: {
      mode: tier ? `tier:${tier}` : mode,
      limit,
      force,
      resume,
      skipExisting,
      sequential,
      model,
      size,
      quality,
      outputFormat,
      moderation,
      concurrency,
      maxRetries,
      delayMs
    },
    summary: {
      status: checks.every((item) => item.pass) ? "passed" : "failed",
      selected: selectedRows.length,
      attempted: workRows.length,
      resultCounts,
      assetStatusCounts: statusCounts,
      reviewStatusCounts: reviewCounts,
      missingGeneratedImages: missingGeneratedImages.length,
      pngFailures: pngFailures.length
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

function readManualReviewById() {
  if (manualReviewCache) return manualReviewCache;
  manualReviewCache = new Map();
  if (!fs.existsSync(manualReviewPath)) return manualReviewCache;
  const parsed = parseCsv(fs.readFileSync(manualReviewPath, "utf8"));
  if (parsed.length < 2) return manualReviewCache;
  const [headers, ...rows] = parsed;
  for (const row of rows) {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = row[index] ?? "";
    });
    if (record.questionId) manualReviewCache.set(record.questionId, record);
  }
  return manualReviewCache;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((candidate) => candidate.some((value) => value !== ""));
}

function writeReviewArtifacts(manifestPackage) {
  const priorReviewById = readManualReviewById();
  fs.writeFileSync(manualReviewPath, toCsv(manifestPackage.assets.map((asset) => reviewRowFor(asset, priorReviewById.get(asset.questionId))), reviewCsvColumns()));
  fs.mkdirSync(path.dirname(reviewHtmlPath), { recursive: true });
  fs.writeFileSync(reviewHtmlPath, buildReviewHtml(manifestPackage));
  manualReviewCache = null;
}

function reviewRowFor(asset, prior = {}) {
  return {
    ...asset,
    reviewDecision: prior.reviewDecision ?? "",
    mathObjectCheck: prior.mathObjectCheck ?? "",
    ageAppropriateCheck: prior.ageAppropriateCheck ?? "",
    copyrightCheck: prior.copyrightCheck ?? "",
    textErrorCheck: prior.textErrorCheck ?? "",
    reviewNotes: prior.reviewNotes ?? ""
  };
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

function buildReviewHtml(manifestPackage) {
  const tierCounts = countBy(manifestPackage.assets, "needTier");
  const statusCounts = countBy(manifestPackage.assets, "assetStatus");
  const rowsJson = JSON.stringify(manifestPackage.assets.map((asset) => ({
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
      <span>Queue: ${manifestPackage.assets.length}</span>
      <span>A_required: ${tierCounts.A_required ?? 0}</span>
      <span>B_strong_recommended: ${tierCounts.B_strong_recommended ?? 0}</span>
      <span>Generated pending review: ${statusCounts["generated-pending-review"] ?? 0}</span>
      <span>Not generated: ${statusCounts["not-generated"] ?? 0}</span>
      <span>Generation failed: ${statusCounts["generation-failed"] ?? 0}</span>
    </div>
    <div class="filters">
      <select id="tier"><option value="">All tiers</option><option>A_required</option><option>B_strong_recommended</option></select>
      <select id="category"><option value="">All categories</option></select>
      <select id="status"><option value="">All statuses</option><option>not-generated</option><option>generated-pending-review</option><option>generation-failed</option><option>approved</option><option>needs-regeneration</option><option>pending-review</option></select>
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
              <span class="tag">\${row.reviewStatus}</span>
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

function redact(message) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return message;
  return message.split(key).join("[REDACTED_OPENAI_API_KEY]");
}
