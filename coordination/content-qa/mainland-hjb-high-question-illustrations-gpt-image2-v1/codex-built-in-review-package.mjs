#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../../..");
const packageDir = path.relative(projectRoot, __dirname);
const manifestPath = path.join(__dirname, "question-illustration-plan.json");
const statePath = path.join(__dirname, "codex-built-in-generation-state.json");
const manualReviewPath = path.join(__dirname, "manual-review.csv");
const validationReportPath = path.join(__dirname, "validation-report.json");
const indexMdPath = path.join(__dirname, "index.md");
const indexHtmlPath = path.join(__dirname, "index.html");
const promptsDir = path.join(__dirname, "prompts");
const candidatesDir = path.join(__dirname, "candidates");

const expected = {
  manifestRows: 3813,
  p1: 1622,
  p2: 2191,
  smokeRows: 33,
  generatedFilesAfterFullRun: 3813
};

const mode = process.argv[2] ?? "help";

switch (mode) {
  case "init":
    writeState(recalculateState(readManifest(), readState(), { activeMode: flagValue("--mode") ?? "smoke" }));
    console.log(JSON.stringify(readState(), null, 2));
    break;
  case "next":
    printNext();
    break;
  case "import":
    importGeneratedImage();
    break;
  case "fail":
    recordFailure();
    break;
  case "review":
    recordReview();
    break;
  case "rebuild":
    rebuildPackage(readManifest(), readState());
    break;
  case "summary":
    rebuildPackage(readManifest(), readState());
    console.log(JSON.stringify(readValidation(), null, 2));
    break;
  default:
    printHelp();
}

function printNext() {
  const manifest = readManifest();
  const state = readState();
  const selectedMode = flagValue("--mode") ?? state.activeMode ?? "smoke";
  const force = hasFlag("--force");
  const queue = selectedMode === "smoke" ? smokeRows(manifest) : manifest.illustrations;
  const row = queue.find((candidate) => {
    const absoluteCandidatePath = path.join(projectRoot, candidate.candidatePath);
    if (!force && fs.existsSync(absoluteCandidatePath)) return false;
    if (state.generated[candidate.questionId] && !force) return false;
    return true;
  });

  if (!row) {
    console.log(JSON.stringify({
      status: "empty",
      mode: selectedMode,
      message: "No pending rows. Use --force to re-run existing candidates."
    }, null, 2));
    return;
  }

  console.log(JSON.stringify({
    status: "ready",
    mode: selectedMode,
    questionId: row.questionId,
    id: row.id,
    sequence: row.sequence,
    illustrationTier: row.illustrationTier,
    illustrationCategory: row.illustrationCategory,
    reusableTemplateKey: row.reusableTemplateKey,
    candidatePath: row.candidatePath,
    prompt: builtInPrompt(row)
  }, null, 2));
}

function importGeneratedImage() {
  const questionId = requiredFlag("--question-id");
  const source = path.resolve(requiredFlag("--source"));
  const force = hasFlag("--force");
  const manifest = readManifest();
  const state = readState();
  const row = manifest.illustrations.find((candidate) => candidate.questionId === questionId);
  if (!row) die(`Unknown questionId: ${questionId}`);

  const target = path.join(projectRoot, row.candidatePath);
  if (fs.existsSync(target) && !force) die(`Candidate already exists: ${row.candidatePath}. Use --force to overwrite.`);

  const sourceInfo = validatePng(source);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  const targetInfo = validatePng(target);
  const generatedAt = new Date().toISOString();

  row.generatedVia = "codex-built-in-image_gen";
  row.generatedAt = generatedAt;
  row.sourceGeneratedPath = source;
  row.importedAt = generatedAt;
  row.importedBytes = targetInfo.bytes;
  row.importedDimensions = {
    width: targetInfo.width,
    height: targetInfo.height
  };
  row.reviewStatus = row.reviewStatus === "approved" ? "approved" : "pending";

  state.generated[questionId] = {
    id: row.id,
    generatedAt,
    sourceGeneratedPath: source,
    candidatePath: row.candidatePath,
    bytes: targetInfo.bytes,
    dimensions: row.importedDimensions,
    sourceDimensions: {
      width: sourceInfo.width,
      height: sourceInfo.height
    }
  };
  delete state.failed[questionId];
  delete state.skipped[questionId];
  state.last = {
    action: "import",
    questionId,
    at: generatedAt,
    sourceGeneratedPath: source,
    candidatePath: row.candidatePath
  };

  writeManifest(manifest);
  writeState(recalculateState(manifest, state));
  rebuildPackage(manifest, readState());
  console.log(JSON.stringify({
    imported: questionId,
    candidatePath: row.candidatePath,
    bytes: targetInfo.bytes,
    dimensions: row.importedDimensions
  }, null, 2));
}

function recordFailure() {
  const questionId = requiredFlag("--question-id");
  const message = requiredFlag("--message");
  const state = readState();
  const failedAt = new Date().toISOString();
  const existing = state.failed[questionId] ?? { attempts: 0 };
  state.failed[questionId] = {
    attempts: existing.attempts + 1,
    failedAt,
    message
  };
  state.last = {
    action: "fail",
    questionId,
    at: failedAt,
    message
  };
  writeState(recalculateState(readManifest(), state));
  console.log(JSON.stringify(state.failed[questionId], null, 2));
}

function recordReview() {
  const questionId = requiredFlag("--question-id");
  const status = requiredFlag("--status");
  const notes = flagValue("--notes") ?? "";
  const allowed = new Set(["pending", "approved", "revise", "reject"]);
  if (!allowed.has(status)) die(`Invalid review status: ${status}. Use pending, approved, revise, or reject.`);
  const manifest = readManifest();
  const state = readState();
  const row = manifest.illustrations.find((candidate) => candidate.questionId === questionId);
  if (!row) die(`Unknown questionId: ${questionId}`);

  row.reviewStatus = status;
  row.reviewerNotes = notes;
  row.reviewedAt = new Date().toISOString();
  state.last = {
    action: "review",
    questionId,
    at: row.reviewedAt,
    reviewStatus: status,
    reviewerNotes: notes
  };

  writeManifest(manifest);
  writeState(recalculateState(manifest, state));
  rebuildPackage(manifest, readState());
  console.log(JSON.stringify({
    reviewed: questionId,
    reviewStatus: status,
    reviewerNotes: notes
  }, null, 2));
}

function rebuildPackage(manifest, state) {
  writeManualReview(manifest.illustrations);
  writeIndexes(manifest.illustrations, state);
  writeValidation(manifest.illustrations, state);
  writeManifest(manifest);
  writeState(recalculateState(manifest, state));
}

function builtInPrompt(row) {
  return [
    row.generationPrompt,
    "",
    "Codex built-in image_gen route requirements:",
    "Generate a single original 16:9 PNG-style educational base illustration.",
    "Keep the image as a math visual scaffold only; do not add readable text, equations, numbers, labels, logos, watermarks, page frames, textbook screenshots, or answer clues.",
    "The generated output will be copied into a review package; leave whitespace for deterministic overlays."
  ].join("\n");
}

function smokeRows(manifest) {
  const seen = new Set();
  return manifest.illustrations.filter((row) => {
    if (seen.has(row.reusableTemplateKey)) return false;
    seen.add(row.reusableTemplateKey);
    return true;
  });
}

function writeManualReview(rows) {
  const headers = [
    "id",
    "questionId",
    "reviewStatus",
    "reviewerNotes",
    "illustrationTier",
    "illustrationCategory",
    "reusableTemplateKey",
    "candidatePath",
    "generatedVia",
    "generatedAt",
    "sourceGeneratedPath",
    "importedBytes",
    "importedDimensions",
    "model",
    "size",
    "quality",
    "exactMathLabelsNeeded",
    "sourcePromptZh"
  ];
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvCell(header === "importedDimensions" ? JSON.stringify(row[header] ?? "") : row[header])).join(","))
  ];
  fs.writeFileSync(manualReviewPath, `${lines.join("\n")}\n`);
}

function writeIndexes(rows, state) {
  const categoryRows = Object.entries(groupBy(rows, (row) => row.illustrationCategory))
    .sort(([left], [right]) => left.localeCompare(right, "zh-Hans"))
    .map(([category, categoryRows]) => [
      category,
      categoryRows.length,
      categoryRows.filter((row) => fs.existsSync(path.join(projectRoot, row.candidatePath))).length
    ]);

  const generatedCount = rows.filter((row) => fs.existsSync(path.join(projectRoot, row.candidatePath))).length;
  const markdownRows = rows.slice(0, 400).map((row) => [
    row.questionId,
    row.illustrationTier,
    row.illustrationCategory,
    row.reusableTemplateKey,
    fs.existsSync(path.join(projectRoot, row.candidatePath)) ? "yes" : "pending",
    row.candidatePath,
    row.sourcePromptZh
  ]);

  fs.writeFileSync(indexMdPath, [
    "# Mainland HJB High Codex Built-In Question Illustrations V1",
    "",
    `- Rebuilt at: ${new Date().toISOString()}`,
    "- Review package only: no product integration, no public assets.",
    `- Manifest rows: ${rows.length}`,
    `- Generated files: ${generatedCount}`,
    `- Smoke template rows: ${smokeRows({ illustrations: rows }).length}`,
    `- Built-in state: \`codex-built-in-generation-state.json\``,
    `- Last action: ${state.last ? `${state.last.action} / ${state.last.questionId}` : "none"}`,
    "",
    "## Category Counts",
    "",
    mdTable(["Category", "Rows", "Generated"], categoryRows),
    "",
    "## Preview Rows",
    "",
    "Only the first 400 rows are listed here to keep the Markdown review page manageable. Use `question-illustration-plan.json` and `manual-review.csv` for the full 3,813-row queue.",
    "",
    mdTable(["Question ID", "Tier", "Category", "Template", "Image", "Candidate Path", "Prompt"], markdownRows),
    ""
  ].join("\n"));

  const cards = rows.slice(0, 600).map((row) => {
    const absolutePath = path.join(projectRoot, row.candidatePath);
    const relative = path.relative(__dirname, absolutePath).replaceAll(path.sep, "/");
    const exists = fs.existsSync(absolutePath);
    const media = exists
      ? `<img src="${escapeHtml(relative)}" alt="${escapeHtml(row.questionId)}">`
      : `<div class="placeholder">pending</div>`;
    return `<article class="card">
      ${media}
      <h2>${escapeHtml(row.questionId)}</h2>
      <p><strong>${escapeHtml(row.illustrationTier)}</strong> ${escapeHtml(row.illustrationCategory)}</p>
      <p>${escapeHtml(row.sourcePromptZh)}</p>
      <code>${escapeHtml(row.reusableTemplateKey)}</code>
    </article>`;
  }).join("\n");

  fs.writeFileSync(indexHtmlPath, `<!doctype html>
<html lang="zh-Hans">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Mainland HJB High Codex Built-In Question Illustrations V1</title>
  <style>
    body { margin: 0; background: #f8fafc; color: #172033; font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    header { max-width: 1180px; margin: 0 auto; padding: 28px 20px 12px; }
    h1 { margin: 0 0 8px; font-size: 30px; }
    .grid { max-width: 1400px; margin: 0 auto; padding: 20px; display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; }
    .card { background: #fff; border: 1px solid #dbe4ef; border-radius: 8px; padding: 12px; box-shadow: 0 8px 24px rgba(15,23,42,.05); }
    img, .placeholder { width: 100%; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 6px; background: #e2e8f0; display: grid; place-items: center; color: #64748b; }
    h2 { font-size: 14px; margin: 10px 0 6px; }
    p { margin: 6px 0; font-size: 12px; }
    code { display: block; overflow-wrap: anywhere; font-size: 11px; color: #475569; }
  </style>
</head>
<body>
  <header>
    <h1>Mainland HJB High Codex Built-In Question Illustrations V1</h1>
    <p>Review-only package. Generated files: ${generatedCount} / ${rows.length}. Showing first 600 rows; use manifest and CSV for all candidates.</p>
  </header>
  <main class="grid">${cards}</main>
</body>
</html>
`);
}

function writeValidation(rows, state) {
  const imageRows = rows.map((row) => {
    const absolutePath = path.join(projectRoot, row.candidatePath);
    const exists = fs.existsSync(absolutePath);
    const dimensions = exists ? pngDimensions(absolutePath) : null;
    const bytes = exists ? fs.statSync(absolutePath).size : 0;
    return {
      id: row.id,
      questionId: row.questionId,
      candidatePath: row.candidatePath,
      exists,
      dimensions,
      bytes,
      generatedVia: row.generatedVia ?? null,
      reviewStatus: row.reviewStatus
    };
  });
  const generatedRows = imageRows.filter((row) => row.exists);
  const invalidPng = imageRows.filter((row) => row.exists && !row.dimensions);
  const suspiciousSmall = imageRows.filter((row) => row.exists && row.bytes < 10_000);
  const outsideCandidateDir = rows.filter((row) => !row.candidatePath.startsWith(`${packageDir}/candidates/`));
  const promptChunkTotal = fs.readdirSync(promptsDir)
    .filter((fileName) => /^chunk-\d{3}\.jsonl$/u.test(fileName))
    .reduce((sum, fileName) => sum + readJsonlLineCount(path.join(promptsDir, fileName)), 0);

  const report = {
    generatedAt: new Date().toISOString(),
    packageDir,
    source: "codex-built-in-image_gen",
    expected,
    actual: {
      manifestRows: rows.length,
      p1: rows.filter((row) => row.illustrationTier === "P1").length,
      p2: rows.filter((row) => row.illustrationTier === "P2").length,
      uniqueQuestionIds: new Set(rows.map((row) => row.questionId)).size,
      smokeRows: smokeRows({ illustrations: rows }).length,
      promptChunkTotal,
      manualReviewRows: countDataRows(manualReviewPath),
      generatedFiles: generatedRows.length,
      importedByCodexBuiltIn: rows.filter((row) => row.generatedVia === "codex-built-in-image_gen").length,
      failed: Object.keys(state.failed).length,
      skipped: Object.keys(state.skipped).length,
      invalidPngFiles: invalidPng.length,
      suspiciousSmallFiles: suspiciousSmall.length,
      outsideCandidateDir: outsideCandidateDir.length
    },
    checks: [
      check("manifest row count", rows.length, expected.manifestRows),
      check("P1 count", rows.filter((row) => row.illustrationTier === "P1").length, expected.p1),
      check("P2 count", rows.filter((row) => row.illustrationTier === "P2").length, expected.p2),
      check("unique question IDs", new Set(rows.map((row) => row.questionId)).size, rows.length),
      check("smoke rows", smokeRows({ illustrations: rows }).length, expected.smokeRows),
      check("prompt chunk total", promptChunkTotal, expected.manifestRows),
      check("manual review rows", countDataRows(manualReviewPath), rows.length),
      check("candidate paths under package candidates", outsideCandidateDir.length, 0)
    ],
    imageChecks: {
      status: generatedRows.length === expected.generatedFilesAfterFullRun ? "complete" : "pending-generation",
      generatedFiles: generatedRows.length,
      expectedFiles: expected.generatedFilesAfterFullRun,
      invalidPngFiles: invalidPng.map((row) => row.candidatePath),
      suspiciousSmallFiles: suspiciousSmall.map((row) => row.candidatePath),
      note: "Codex built-in image generation does not guarantee exact 1536x864 output; exact sizing can be normalized in a later asset-compression pass."
    },
    stateSummary: state.summary
  };
  report.packageChecksPassed = report.checks.every((item) => item.passed);
  fs.writeFileSync(validationReportPath, `${JSON.stringify(report, null, 2)}\n`);
}

function recalculateState(manifest, state, overrides = {}) {
  const generatedEntries = { ...state.generated };
  for (const row of manifest.illustrations) {
    const candidatePath = path.join(projectRoot, row.candidatePath);
    if (!generatedEntries[row.questionId] && fs.existsSync(candidatePath)) {
      const dimensions = pngDimensions(candidatePath);
      generatedEntries[row.questionId] = {
        id: row.id,
        candidatePath: row.candidatePath,
        generatedAt: row.generatedAt ?? null,
        sourceGeneratedPath: row.sourceGeneratedPath ?? null,
        bytes: fs.statSync(candidatePath).size,
        dimensions
      };
    }
  }
  return {
    version: "codex-built-in-image_gen-v1",
    updatedAt: new Date().toISOString(),
    package: "mainland-hjb-high-question-illustrations-gpt-image2-v1",
    activeMode: overrides.activeMode ?? state.activeMode ?? "smoke",
    generatedVia: "codex-built-in-image_gen",
    summary: {
      targetRows: manifest.illustrations.length,
      smokeRows: smokeRows(manifest).length,
      generated: Object.keys(generatedEntries).length,
      failed: Object.keys(state.failed ?? {}).length,
      skipped: Object.keys(state.skipped ?? {}).length
    },
    last: state.last ?? null,
    generated: generatedEntries,
    failed: state.failed ?? {},
    skipped: state.skipped ?? {}
  };
}

function validatePng(filePath) {
  if (!fs.existsSync(filePath)) die(`Source image not found: ${filePath}`);
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) die(`Source is not a file: ${filePath}`);
  if (stat.size < 10_000) die(`Source image is too small to trust as a generated PNG: ${stat.size} bytes`);
  const dimensions = pngDimensions(filePath);
  if (!dimensions) die(`Source image is not a readable PNG: ${filePath}`);
  if (dimensions.width < 512 || dimensions.height < 288) {
    die(`Source PNG dimensions are too small: ${dimensions.width}x${dimensions.height}`);
  }
  return {
    bytes: stat.size,
    ...dimensions
  };
}

function pngDimensions(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const buffer = fs.readFileSync(filePath);
  if (buffer.length < 24 || buffer.toString("ascii", 1, 4) !== "PNG") return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}

function readManifest() {
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

function writeManifest(manifest) {
  manifest.generatedAt = manifest.generatedAt ?? new Date().toISOString();
  manifest.codexBuiltInRoute = {
    enabled: true,
    generatedVia: "codex-built-in-image_gen",
    stateFile: "codex-built-in-generation-state.json",
    updatedAt: new Date().toISOString()
  };
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

function readState() {
  if (!fs.existsSync(statePath)) {
    return {
      activeMode: "smoke",
      generated: {},
      failed: {},
      skipped: {},
      last: null
    };
  }
  return JSON.parse(fs.readFileSync(statePath, "utf8"));
}

function writeState(state) {
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
}

function readValidation() {
  return JSON.parse(fs.readFileSync(validationReportPath, "utf8"));
}

function readJsonlLineCount(filePath) {
  return fs.readFileSync(filePath, "utf8").split(/\r?\n/u).filter(Boolean).length;
}

function countDataRows(filePath) {
  if (!fs.existsSync(filePath)) return 0;
  return Math.max(0, fs.readFileSync(filePath, "utf8").split(/\r?\n/u).filter(Boolean).length - 1);
}

function check(name, actual, expectedValue) {
  return {
    name,
    actual,
    expected: expectedValue,
    passed: JSON.stringify(actual) === JSON.stringify(expectedValue)
  };
}

function groupBy(rows, keyFn) {
  return rows.reduce((groups, row) => {
    const key = keyFn(row);
    groups[key] ??= [];
    groups[key].push(row);
    return groups;
  }, {});
}

function csvCell(value) {
  const text = String(value ?? "").replace(/\s*\r?\n\s*/gu, " ");
  return /[",\n\r]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function mdTable(headers, rows) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map((cell) => String(cell ?? "").replaceAll("|", "\\|")).join(" | ")} |`)
  ].join("\n");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function requiredFlag(name) {
  const value = flagValue(name);
  if (!value) die(`Missing required flag: ${name}`);
  return value;
}

function flagValue(name) {
  const args = process.argv.slice(2);
  const exactIndex = args.indexOf(name);
  if (exactIndex >= 0) return args[exactIndex + 1];
  const prefix = `${name}=`;
  const match = args.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

function hasFlag(name) {
  return process.argv.slice(2).includes(name);
}

function die(message) {
  console.error(message);
  process.exit(1);
}

function printHelp() {
  console.log(`Codex built-in image_gen review-package helper

Commands:
  init [--mode smoke|full]
  next [--mode smoke|full] [--force]
  import --question-id <id> --source <generated-png-path> [--force]
  fail --question-id <id> --message <error>
  review --question-id <id> --status pending|approved|revise|reject [--notes <text>]
  rebuild
  summary

Workflow:
  1. node ${packageDir}/codex-built-in-review-package.mjs next --mode smoke
  2. Generate the printed prompt with Codex built-in image_gen.
  3. node ${packageDir}/codex-built-in-review-package.mjs import --question-id <id> --source <path>
`);
}
