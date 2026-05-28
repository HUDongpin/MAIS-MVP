#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../../..");
const queuePath = path.join(scriptDir, "image2-generation-queue.jsonl");
const manualReviewPath = path.join(scriptDir, "manual-review.csv");
const resultsPath = path.join(scriptDir, "image2-generation-results.json");
const approvedDir = path.join(scriptDir, "approved");
const approvedManifestPath = path.join(scriptDir, "approved-question-illustrations.json");

const allowedApprovedStatus = "approved";

const queueRows = readJsonl(queuePath);
const queueById = new Map(queueRows.map((row) => [row.questionId, row]));
const reviewRows = readCsv(manualReviewPath);
const results = readJson(resultsPath, { results: [] });
const resultsById = new Map((results.results ?? []).map((row) => [row.questionId, row]));

fs.mkdirSync(approvedDir, { recursive: true });

const approvedAssets = [];
const skipped = [];

for (const review of reviewRows) {
  if (review.qaStatus !== allowedApprovedStatus) continue;
  const queueRow = queueById.get(review.questionId);
  const result = resultsById.get(review.questionId);
  if (!queueRow) {
    skipped.push({ questionId: review.questionId, reason: "missing queue row" });
    continue;
  }

  const sourcePath = path.join(scriptDir, queueRow.outputPath);
  if (!fs.existsSync(sourcePath) || fs.statSync(sourcePath).size === 0) {
    skipped.push({ questionId: review.questionId, reason: "approved in review but candidate image is missing" });
    continue;
  }

  const approvedRelPath = `approved/${queueRow.questionId}.png`;
  const approvedPath = path.join(scriptDir, approvedRelPath);
  fs.copyFileSync(sourcePath, approvedPath);
  const dimensions = readPngDimensions(approvedPath);
  approvedAssets.push({
    questionId: queueRow.questionId,
    src: approvedRelPath,
    sourceCandidate: queueRow.outputPath,
    width: dimensions?.width ?? null,
    height: dimensions?.height ?? null,
    illustrationType: queueRow.illustrationType,
    grade: queueRow.grade,
    semester: queueRow.semester,
    volume: queueRow.volume,
    unitTitle: queueRow.unitTitle,
    topicId: queueRow.topicId,
    qaStatus: review.qaStatus,
    reviewNotes: review.reviewNotes ?? "",
    generatedAt: result?.generatedAt ?? null,
    adoptedAt: new Date().toISOString(),
    productIntegrationStatus: "not-integrated"
  });
}

writeJson(approvedManifestPath, {
  schemaVersion: "mainland-hjb-junior-approved-question-illustrations-v1",
  generatedAt: new Date().toISOString(),
  sourceReview: path.relative(rootDir, manualReviewPath),
  sourceQueue: path.relative(rootDir, queuePath),
  approvalPolicy: "Only manual-review.csv rows with qaStatus=approved and an existing candidate image are copied.",
  totalApproved: approvedAssets.length,
  skipped,
  assets: approvedAssets.sort((left, right) => left.questionId.localeCompare(right.questionId))
});

console.log(JSON.stringify({
  approved: approvedAssets.length,
  skipped: skipped.length,
  approvedManifest: path.relative(rootDir, approvedManifestPath),
  approvedDir: path.relative(rootDir, approvedDir)
}, null, 2));

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`Missing JSONL file: ${filePath}`);
  return fs.readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readCsv(filePath) {
  if (!fs.existsSync(filePath)) throw new Error(`Missing CSV file: ${filePath}`);
  const rows = parseCsv(fs.readFileSync(filePath, "utf8"));
  const [headers, ...dataRows] = rows;
  return dataRows.map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ""])));
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (inQuotes) {
      if (char === '"' && next === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        value += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else if (char !== "\r") {
      value += char;
    }
  }

  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  return rows.filter((parsedRow) => parsedRow.some((cell) => cell !== ""));
}

function readPngDimensions(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length < 24 || buffer.toString("ascii", 1, 4) !== "PNG") return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  };
}
