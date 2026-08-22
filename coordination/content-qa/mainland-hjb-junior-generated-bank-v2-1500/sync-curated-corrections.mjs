import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyHjbJuniorCuratedCorrection,
  hjbJuniorCuratedCorrectionIds
} from "./curated-corrections.mjs";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(currentDirectory, "../../..");
const applyChanges = process.argv.includes("--apply");
const correctionIdSet = new Set(hjbJuniorCuratedCorrectionIds);

const csvColumns = [
  "id",
  "batch",
  "grade",
  "semester",
  "topicId",
  "unitTitle",
  "volume",
  "conceptIds",
  "difficulty",
  "type",
  "promptZhHans",
  "optionsZhHans",
  "answer",
  "acceptedAnswers",
  "explanationZhHans",
  "evidenceCardIds",
  "assessmentPatternCardIds",
  "paperPatternCardIds",
  "examPatternCardIds",
  "sourceDistanceStatus",
  "mathQaStatus",
  "terminologyQaStatus",
  "manualQaStatus",
  "reviewNotes"
];

function csvEscape(value) {
  const text = (Array.isArray(value) ? value.join(" | ") : String(value ?? ""))
    .replace(/\s*\r?\n\s*/g, " ");
  return /[",\n\r]/u.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function renderCsv(rows) {
  const lines = [
    csvColumns.join(","),
    ...rows.map((row) => csvColumns.map((column) => csvEscape(row[column])).join(","))
  ];
  return `${lines.join("\n")}\n`;
}

function parsePack(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function parseJsonl(filePath) {
  return fs.readFileSync(filePath, "utf8").trim().split(/\r?\n/u).map((line) => JSON.parse(line));
}

function renderJsonl(rows) {
  return `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`;
}

function applyToRows(rows, label) {
  const seen = new Set();
  const corrected = rows.map((row) => {
    if (!correctionIdSet.has(row.id)) return row;
    if (seen.has(row.id)) throw new Error(`${label} contains duplicate correction id ${row.id}`);
    seen.add(row.id);
    return applyHjbJuniorCuratedCorrection(row.id, row);
  });
  const missing = hjbJuniorCuratedCorrectionIds.filter((id) => !seen.has(id));
  if (missing.length) throw new Error(`${label} is missing correction ids: ${missing.join(", ")}`);
  return corrected;
}

const writes = [];

function planWrite(filePath, contents) {
  const current = fs.readFileSync(filePath, "utf8");
  if (current === contents) return;
  writes.push({ filePath, contents });
}

const jsonlPath = path.join(currentDirectory, "questions.jsonl");
const correctedJsonlQuestions = applyToRows(parseJsonl(jsonlPath), "questions.jsonl");
if (correctedJsonlQuestions.length !== 1_500) {
  throw new Error(`questions.jsonl expected 1500 rows, got ${correctedJsonlQuestions.length}`);
}
planWrite(jsonlPath, renderJsonl(correctedJsonlQuestions));
planWrite(path.join(currentDirectory, "questions.csv"), renderCsv(correctedJsonlQuestions));

for (const packPath of [
  path.join(currentDirectory, "question-pack.json"),
  path.join(
    repositoryRoot,
    "data/generated-content/mainland-hjb-junior-generated-bank-v2-1500/question-pack.json"
  )
]) {
  const pack = parsePack(packPath);
  if (!Array.isArray(pack.questions) || pack.questions.length !== 1_500) {
    throw new Error(`${packPath} must contain exactly 1500 questions`);
  }
  pack.questions = applyToRows(pack.questions, packPath);
  planWrite(packPath, `${JSON.stringify(pack, null, 2)}\n`);
}

const batchDirectory = path.join(currentDirectory, "batches");
const batchFiles = fs.readdirSync(batchDirectory)
  .filter((name) => /^batch-\d{3}\.json$/u.test(name))
  .sort();
const batchHits = new Map(hjbJuniorCuratedCorrectionIds.map((id) => [id, 0]));

for (const batchName of batchFiles) {
  const batchPath = path.join(batchDirectory, batchName);
  const batch = parsePack(batchPath);
  if (!Array.isArray(batch.questions)) throw new Error(`${batchName} has no questions array`);
  let changed = false;
  batch.questions = batch.questions.map((row) => {
    if (!correctionIdSet.has(row.id)) return row;
    batchHits.set(row.id, (batchHits.get(row.id) ?? 0) + 1);
    changed = true;
    return applyHjbJuniorCuratedCorrection(row.id, row);
  });
  if (changed) planWrite(batchPath, `${JSON.stringify(batch, null, 2)}\n`);
}

const invalidBatchHits = Array.from(batchHits.entries()).filter(([, count]) => count !== 1);
if (invalidBatchHits.length) {
  throw new Error(`each correction must occur in one batch: ${JSON.stringify(invalidBatchHits)}`);
}

if (applyChanges) {
  writes.forEach(({ filePath, contents }) => fs.writeFileSync(filePath, contents));
}

console.log(JSON.stringify({
  mode: applyChanges ? "apply" : "check",
  correctionCount: hjbJuniorCuratedCorrectionIds.length,
  batchCount: batchFiles.length,
  changedFileCount: writes.length,
  changedFiles: writes.map(({ filePath }) => path.relative(repositoryRoot, filePath))
}, null, 2));

if (!applyChanges && writes.length) process.exitCode = 1;
