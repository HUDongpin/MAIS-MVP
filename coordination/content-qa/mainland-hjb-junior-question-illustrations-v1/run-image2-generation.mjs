#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../../..");
const queuePath = path.join(scriptDir, "image2-generation-queue.jsonl");
const resultsPath = path.join(scriptDir, "image2-generation-results.json");
const candidatesDir = path.join(scriptDir, "candidates");
const dryRunReportPath = path.join(scriptDir, "image2-generation-dry-run.json");
const reviewDir = path.join(scriptDir, "review");
const reviewIndexPath = path.join(reviewDir, "index.html");
const manualReviewPath = path.join(scriptDir, "manual-review.csv");

const args = parseArgs(process.argv.slice(2));
const dryRun = Boolean(args["dry-run"]);
const force = Boolean(args.force);
const phase = String(args.phase ?? "pilot");
const onlyType = args.type ? String(args.type) : null;
const model = String(args.model ?? "gpt-image-2");
const quality = String(args.quality ?? "high");
const size = String(args.size ?? "1536x1024");
const outputFormat = String(args["output-format"] ?? "png");
const maxConcurrency = positiveInteger(process.env.IMAGE2_MAX_CONCURRENCY ?? args.concurrency, 1);
const minDelayMs = nonNegativeInteger(process.env.IMAGE2_MIN_DELAY_MS ?? args.delay, 15_000);
const maxRetries = positiveInteger(process.env.IMAGE2_MAX_RETRIES ?? args.retries, 4);
const limit = positiveInteger(process.env.IMAGE2_LIMIT ?? args.limit, null);

const allowedPhases = new Set(["pilot", "full", "all"]);
if (!allowedPhases.has(phase)) throw new Error(`Invalid --phase ${phase}. Use pilot, full, or all.`);

const queueRows = readQueue();
const selectedRows = selectRows(queueRows);
const resultsManifest = readResultsManifest();

fs.mkdirSync(candidatesDir, { recursive: true });
fs.mkdirSync(reviewDir, { recursive: true });

if (dryRun) {
  const dryRunReport = {
    schemaVersion: "mainland-hjb-junior-image2-dry-run-v1",
    generatedAt: new Date().toISOString(),
    phase,
    onlyType,
    limit,
    model,
    quality,
    size,
    outputFormat,
    selectedRows: selectedRows.length,
    checks: validateQueue(selectedRows),
    byType: countBy(selectedRows, (row) => row.illustrationType),
    sampleRows: selectedRows.slice(0, 12).map((row) => ({
      questionId: row.questionId,
      batchPhase: row.batchPhase,
      illustrationType: row.illustrationType,
      outputPath: row.outputPath,
      promptPreview: row.prompt.slice(0, 500)
    }))
  };
  writeJson(dryRunReportPath, dryRunReport);
  writeReviewArtifacts(resultsManifest.results);
  console.log(JSON.stringify({
    dryRun: true,
    selectedRows: selectedRows.length,
    checks: dryRunReport.checks,
    dryRunReport: path.relative(rootDir, dryRunReportPath)
  }, null, 2));
  process.exit(0);
}

if (!process.env.OPENAI_API_KEY) {
  console.error("Blocked: OPENAI_API_KEY is missing. No GPT Image2 API call was made.");
  process.exit(2);
}

const runResults = await runGeneration(selectedRows);
const mergedResults = mergeResults(resultsManifest.results, runResults);
writeResultsManifest(mergedResults);
writeReviewArtifacts(mergedResults);
console.log(JSON.stringify({
  dryRun: false,
  selectedRows: selectedRows.length,
  runStatus: countBy(runResults, (row) => row.status),
  manifestStatus: countBy(mergedResults, (row) => row.status),
  resultsPath: path.relative(rootDir, resultsPath),
  manualReviewPath: path.relative(rootDir, manualReviewPath),
  reviewIndexPath: path.relative(rootDir, reviewIndexPath)
}, null, 2));

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index];
    if (!raw.startsWith("--")) continue;
    const key = raw.slice(2);
    const equals = key.indexOf("=");
    if (equals >= 0) {
      parsed[key.slice(0, equals)] = key.slice(equals + 1);
      continue;
    }

    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      parsed[key] = next;
      index += 1;
    } else {
      parsed[key] = true;
    }
  }
  return parsed;
}

function positiveInteger(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function nonNegativeInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function readQueue() {
  if (!fs.existsSync(queuePath)) throw new Error(`Queue file not found. Run build-image2-production-package.mjs first: ${queuePath}`);
  const rows = fs.readFileSync(queuePath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => {
      const row = JSON.parse(line);
      const missing = ["questionId", "batchPhase", "illustrationType", "prompt", "outputPath"].filter((key) => !row[key]);
      if (missing.length) throw new Error(`Queue line ${index + 1} missing ${missing.join(", ")}`);
      return row;
    });

  if (rows.length !== 823) throw new Error(`Expected 823 must-have queue rows, got ${rows.length}.`);
  return rows;
}

function selectRows(rows) {
  let selected = rows;
  if (phase !== "all") selected = selected.filter((row) => row.batchPhase === phase);
  if (onlyType) selected = selected.filter((row) => row.illustrationType === onlyType);
  if (limit) selected = selected.slice(0, limit);
  return selected;
}

function readResultsManifest() {
  if (!fs.existsSync(resultsPath)) {
    return {
      schemaVersion: "mainland-hjb-junior-image2-generation-results-v1",
      generatedAt: new Date().toISOString(),
      results: []
    };
  }
  return JSON.parse(fs.readFileSync(resultsPath, "utf8"));
}

function validateQueue(rows) {
  const requiredFieldsOk = rows.every((row) => row.questionId && row.illustrationType && row.prompt && row.outputPath);
  const uniqueIdsOk = new Set(rows.map((row) => row.questionId)).size === rows.length;
  const outputPathsOk = rows.every((row) => row.outputPath === `candidates/${row.questionId}.png`);
  const promptPolicyOk = rows.every((row) =>
    row.prompt.includes(row.questionId) &&
    row.prompt.includes(row.promptZhHans) &&
    row.prompt.includes("Do not compute or display the final answer") &&
    row.prompt.includes("Do not copy")
  );

  return [
    { name: "selectedRowsHaveRequiredFields", status: requiredFieldsOk ? "PASS" : "FAIL" },
    { name: "selectedRowsHaveUniqueIds", status: uniqueIdsOk ? "PASS" : "FAIL" },
    { name: "outputPathsFollowCandidatesQuestionIdPng", status: outputPathsOk ? "PASS" : "FAIL" },
    { name: "promptsCarryQuestionAndSafetyPolicy", status: promptPolicyOk ? "PASS" : "FAIL" }
  ];
}

async function runGeneration(rows) {
  const existingById = new Map((resultsManifest.results ?? []).map((row) => [row.questionId, row]));
  const queue = rows.map((row) => ({ row, previous: existingById.get(row.questionId) }));
  const results = [];
  let cursor = 0;

  const workers = Array.from({ length: Math.max(1, maxConcurrency) }, async () => {
    while (cursor < queue.length) {
      const item = queue[cursor];
      cursor += 1;

      if (!force && isAlreadyGenerated(item.row, item.previous)) {
        results.push({
          ...resultBase(item.row, item.previous),
          status: "skipped",
          skippedAt: new Date().toISOString(),
          imageExists: true,
          imageBytes: imageBytes(item.row.outputPath)
        });
        continue;
      }

      if (minDelayMs > 0) await sleep(minDelayMs);
      const result = await generateOne(item.row, item.previous);
      results.push(result);
      const merged = mergeResults(resultsManifest.results, results);
      writeResultsManifest(merged);
      writeReviewArtifacts(merged);
    }
  });

  await Promise.all(workers);
  return results;
}

function isAlreadyGenerated(row, previous) {
  const absolutePath = path.join(scriptDir, row.outputPath);
  return previous?.status === "generated" && fs.existsSync(absolutePath) && fs.statSync(absolutePath).size > 0;
}

async function generateOne(row, previous) {
  const absolutePath = path.join(scriptDir, row.outputPath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  const startedAt = new Date().toISOString();
  const attemptsSoFar = Number(previous?.attempts ?? 0);

  try {
    const responseJson = await requestImage(row.prompt);
    const imageBase64 = responseJson?.data?.[0]?.b64_json;
    if (!imageBase64) throw new Error("OpenAI response did not include data[0].b64_json");

    fs.writeFileSync(absolutePath, Buffer.from(imageBase64, "base64"));
    const dimensions = readPngDimensions(absolutePath);

    return {
      ...resultBase(row, previous),
      status: "generated",
      qaStatus: previous?.qaStatus ?? "pending",
      attempts: attemptsSoFar + 1,
      startedAt,
      generatedAt: new Date().toISOString(),
      lastError: null,
      imageExists: true,
      imageBytes: imageBytes(row.outputPath),
      dimensions,
      usage: responseJson?.usage ?? null
    };
  } catch (error) {
    return {
      ...resultBase(row, previous),
      status: "failed",
      qaStatus: previous?.qaStatus ?? "pending",
      attempts: attemptsSoFar + 1,
      startedAt,
      failedAt: new Date().toISOString(),
      lastError: redact(String(error?.message ?? error)),
      imageExists: fs.existsSync(absolutePath),
      imageBytes: imageBytes(row.outputPath),
      dimensions: fs.existsSync(absolutePath) ? readPngDimensions(absolutePath) : null
    };
  }
}

async function requestImage(prompt) {
  let lastError = null;
  for (let attempt = 1; attempt <= maxRetries + 1; attempt += 1) {
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
          output_format: outputFormat
        })
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
      if (!retryable || attempt > maxRetries) throw new Error(`HTTP ${response.status}: ${message}`);
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

function resultBase(row, previous) {
  return {
    questionId: row.questionId,
    queueIndex: row.queueIndex,
    batchPhase: row.batchPhase,
    illustrationType: row.illustrationType,
    outputPath: row.outputPath,
    model,
    quality,
    size,
    outputFormat,
    promptHash: hashString(row.prompt),
    qaStatus: previous?.qaStatus ?? "pending",
    reviewNotes: previous?.reviewNotes ?? "",
    lastError: previous?.lastError ?? null
  };
}

function mergeResults(existingRows, newRows) {
  const byId = new Map((existingRows ?? []).map((row) => [row.questionId, row]));
  for (const row of newRows) byId.set(row.questionId, row);
  for (const queueRow of queueRows) {
    if (!byId.has(queueRow.questionId)) {
      byId.set(queueRow.questionId, {
        ...resultBase(queueRow, null),
        status: fs.existsSync(path.join(scriptDir, queueRow.outputPath)) ? "generated" : "queued",
        attempts: 0,
        imageExists: fs.existsSync(path.join(scriptDir, queueRow.outputPath)),
        imageBytes: imageBytes(queueRow.outputPath),
        dimensions: fs.existsSync(path.join(scriptDir, queueRow.outputPath)) ? readPngDimensions(path.join(scriptDir, queueRow.outputPath)) : null
      });
    }
  }
  return Array.from(byId.values()).sort((left, right) => left.queueIndex - right.queueIndex);
}

function writeResultsManifest(rows) {
  const checks = validateResults(rows);
  const manifest = {
    schemaVersion: "mainland-hjb-junior-image2-generation-results-v1",
    generatedAt: new Date().toISOString(),
    queuePath: path.relative(rootDir, queuePath),
    modelDefaults: { model, quality, size, outputFormat, maxConcurrency, minDelayMs, maxRetries },
    totals: {
      total: rows.length,
      status: countBy(rows, (row) => row.status),
      qaStatus: countBy(rows, (row) => row.qaStatus ?? "pending"),
      illustrationType: countBy(rows, (row) => row.illustrationType),
      imagesPresent: rows.filter((row) => row.imageExists).length
    },
    checks,
    results: rows
  };
  writeJson(resultsPath, manifest);
}

function validateResults(rows) {
  const generated = rows.filter((row) => row.status === "generated").length;
  const failed = rows.filter((row) => row.status === "failed").length;
  const skipped = rows.filter((row) => row.status === "skipped").length;
  const queued = rows.filter((row) => row.status === "queued").length;
  const dimensionIssues = rows.filter((row) => row.status === "generated" && !dimensionsMatch(row.dimensions));
  const approvedWithoutImage = rows.filter((row) => row.qaStatus === "approved" && !row.imageExists);

  return [
    { name: "manifestCoversFullQueue", status: rows.length === 823 ? "PASS" : "FAIL", expected: 823, actual: rows.length },
    { name: "selectedRunAccounting", status: generated + failed + skipped + queued === rows.length ? "PASS" : "FAIL" },
    { name: "generatedImagesHaveExpectedDimensions", status: dimensionIssues.length === 0 ? "PASS" : "FAIL", issues: dimensionIssues.map((row) => row.questionId) },
    { name: "approvedRowsHaveImages", status: approvedWithoutImage.length === 0 ? "PASS" : "FAIL", issues: approvedWithoutImage.map((row) => row.questionId) }
  ];
}

function writeReviewArtifacts(resultRows) {
  const resultById = new Map(resultRows.map((row) => [row.questionId, row]));
  writeManualReview(resultById);
  writeReviewHtml(resultById);
}

function writeManualReview(resultById) {
  const headers = [
    "questionId",
    "status",
    "qaStatus",
    "reviewNotes",
    "batchPhase",
    "illustrationType",
    "grade",
    "volume",
    "unitTitle",
    "imagePath",
    "promptZhHans",
    "generationBriefZhHans",
    "copyrightSafetyZhHans"
  ];
  const lines = [
    headers.join(","),
    ...queueRows.map((row) => {
      const result = resultById.get(row.questionId);
      const values = {
        questionId: row.questionId,
        status: result?.status ?? "queued",
        qaStatus: result?.qaStatus ?? "pending",
        reviewNotes: result?.reviewNotes ?? "",
        batchPhase: row.batchPhase,
        illustrationType: row.illustrationType,
        grade: row.grade,
        volume: row.volume,
        unitTitle: row.unitTitle,
        imagePath: row.outputPath,
        promptZhHans: row.promptZhHans,
        generationBriefZhHans: row.generationBriefZhHans,
        copyrightSafetyZhHans: row.copyrightSafetyZhHans
      };
      return headers.map((header) => csvEscape(values[header])).join(",");
    })
  ];
  fs.writeFileSync(manualReviewPath, `${lines.join("\n")}\n`, "utf8");
}

function writeReviewHtml(resultById) {
  const cards = queueRows.map((row) => {
    const result = resultById.get(row.questionId);
    const imageExists = fs.existsSync(path.join(scriptDir, row.outputPath));
    const media = imageExists
      ? `<img src="../${escapeHtml(row.outputPath)}" alt="${escapeHtml(row.questionId)}">`
      : `<div class="placeholder">Image pending</div>`;

    return `<article class="card">
      ${media}
      <h2>${escapeHtml(row.questionId)}</h2>
      <p><strong>${escapeHtml(row.batchPhase)}</strong> · ${escapeHtml(row.illustrationType)} · ${escapeHtml(row.volume)} · ${escapeHtml(row.unitTitle)}</p>
      <p class="status">Generation: ${escapeHtml(result?.status ?? "queued")} · QA: ${escapeHtml(result?.qaStatus ?? "pending")}</p>
      <details><summary>题干</summary><p>${escapeHtml(row.promptZhHans)}</p></details>
      <details><summary>Prompt</summary><pre>${escapeHtml(row.prompt)}</pre></details>
      <details><summary>QA only</summary><p>Answer: ${escapeHtml(row.answerForQaOnly)}</p><p>${escapeHtml(row.copyrightSafetyZhHans)}</p></details>
    </article>`;
  }).join("\n");

  fs.writeFileSync(reviewIndexPath, `<!doctype html>
<html lang="zh-Hans">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>HJB Junior GPT Image2 Review</title>
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f6f8fb; color: #172033; }
    header { position: sticky; top: 0; background: rgba(246, 248, 251, 0.96); border-bottom: 1px solid #d9e2ef; padding: 16px 24px; }
    main { max-width: 1480px; margin: 0 auto; padding: 20px; display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }
    .card { background: #fff; border: 1px solid #d9e2ef; border-radius: 8px; padding: 12px; }
    img, .placeholder { width: 100%; aspect-ratio: 3 / 2; border-radius: 6px; border: 1px solid #e2e8f0; object-fit: contain; background: #eef2f7; display: grid; place-items: center; color: #64748b; }
    h1 { margin: 0 0 6px; font-size: 24px; }
    h2 { font-size: 15px; margin: 10px 0 4px; }
    p { font-size: 13px; line-height: 1.45; }
    details { margin-top: 8px; border-top: 1px solid #edf2f7; padding-top: 8px; }
    summary { cursor: pointer; font-size: 13px; font-weight: 700; color: #2356a7; }
    pre { white-space: pre-wrap; overflow-wrap: anywhere; background: #f8fafc; border-radius: 6px; padding: 8px; font-size: 11px; line-height: 1.4; }
    .status { color: #2563eb; font-weight: 700; }
  </style>
</head>
<body>
  <header>
    <h1>HJB Junior GPT Image2 Review</h1>
    <p>Queue: ${queueRows.length}; model: ${escapeHtml(model)}; size: ${escapeHtml(size)}; quality: ${escapeHtml(quality)}; format: ${escapeHtml(outputFormat)}.</p>
  </header>
  <main>${cards}</main>
</body>
</html>
`, "utf8");
}

function readPngDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length < 24 || buffer.toString("ascii", 1, 4) !== "PNG") return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

function dimensionsMatch(dimensions) {
  if (!dimensions) return false;
  const [width, height] = size.split("x").map((value) => Number.parseInt(value, 10));
  return dimensions.width === width && dimensions.height === height;
}

function imageBytes(outputPath) {
  const absolutePath = path.join(scriptDir, outputPath);
  return fs.existsSync(absolutePath) ? fs.statSync(absolutePath).size : 0;
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function countBy(rows, keyFn) {
  return rows.reduce((counts, row) => {
    const key = keyFn(row);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});
}

function csvEscape(value) {
  const text = String(value ?? "").replace(/\r?\n/g, " ");
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

function hashString(value) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function backoffMs(attempt) {
  return Math.min(120_000, 1000 * 2 ** (attempt - 1));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
