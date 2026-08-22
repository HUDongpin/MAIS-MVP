import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyHjbPrimaryA18Corrections,
  hjbPrimaryA18CorrectionIds,
  syncHjbPrimaryA18TargetBatches
} from "./a18-primary-runtime-closure-corrections.mjs";

const packageDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(packageDir, "../../..");
const jsonlPath = path.join(packageDir, "questions.jsonl");
const csvPath = path.join(packageDir, "questions.csv");
const coordinationPackPath = path.join(packageDir, "question-pack.json");
const productionPackPath = path.join(
  rootDir,
  "data/generated-content/mainland-hjb-primary-generated-bank-v1-1500/question-pack.json"
);
const batchDir = path.join(packageDir, "batches");
const targetIdSet = new Set(hjbPrimaryA18CorrectionIds);

const csvColumns = [
  "id", "batch", "grade", "semester", "topicId", "unitTitle", "volume", "conceptIds", "difficulty", "type",
  "promptZhHans", "optionsZhHans", "answer", "acceptedAnswers", "explanationZhHans", "evidenceCardIds",
  "assessmentPatternCardIds", "paperPatternCardIds", "sourceDistanceStatus", "mathQaStatus", "terminologyQaStatus",
  "manualQaStatus", "reviewNotes"
];

function atomicWrite(filePath, content) {
  const temporaryPath = `${filePath}.a18-${process.pid}.tmp`;
  fs.writeFileSync(temporaryPath, content);
  fs.renameSync(temporaryPath, filePath);
}

function assertNonTargetsUnchanged(before, after, label) {
  if (before.length !== after.length) throw new Error(`${label} row count changed`);
  for (let index = 0; index < before.length; index += 1) {
    if (before[index].id !== after[index].id) throw new Error(`${label} row order changed at ${index}`);
    if (!targetIdSet.has(before[index].id) && JSON.stringify(before[index]) !== JSON.stringify(after[index])) {
      throw new Error(`${label} non-target row changed: ${before[index].id}`);
    }
  }
}

function csvEscape(value) {
  const text = (Array.isArray(value) ? value.join(" | ") : String(value ?? "")).replace(/\s*\r?\n\s*/gu, " ");
  return /[",\n\r]/u.test(text) ? `"${text.replace(/"/gu, '""')}"` : text;
}

function csvLine(row) {
  return csvColumns.map((column) => csvEscape(row[column])).join(",");
}

function prepareJsonl() {
  const original = fs.readFileSync(jsonlPath, "utf8");
  const originalLines = original.trimEnd().split("\n");
  const before = originalLines.map(JSON.parse);
  const after = applyHjbPrimaryA18Corrections(before);
  assertNonTargetsUnchanged(before, after, "questions.jsonl");
  const finalLines = originalLines.map((line, index) => targetIdSet.has(before[index].id) ? JSON.stringify(after[index]) : line);
  return { rows: after, content: `${finalLines.join("\n")}\n` };
}

function preparePack(filePath, label) {
  const document = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const before = document.questions;
  const after = applyHjbPrimaryA18Corrections(before);
  assertNonTargetsUnchanged(before, after, label);
  return `${JSON.stringify({ ...document, questions: after }, null, 2)}\n`;
}

function prepareCsv(correctedRows) {
  const original = fs.readFileSync(csvPath, "utf8");
  const lines = original.trimEnd().split("\n");
  if (lines[0] !== csvColumns.join(",")) throw new Error("questions.csv header drifted");
  const rowById = new Map(correctedRows.map((row) => [row.id, row]));
  const seenTargets = new Set();
  const finalLines = lines.map((line, index) => {
    if (index === 0) return line;
    const id = line.slice(0, line.indexOf(","));
    if (!targetIdSet.has(id)) return line;
    if (seenTargets.has(id)) throw new Error(`questions.csv duplicate target ${id}`);
    seenTargets.add(id);
    return csvLine(rowById.get(id));
  });
  if (seenTargets.size !== hjbPrimaryA18CorrectionIds.length) {
    throw new Error(`questions.csv matched ${seenTargets.size}/${hjbPrimaryA18CorrectionIds.length} targets`);
  }
  return `${finalLines.join("\n")}\n`;
}

if (targetIdSet.has("hjb-primary-ds-v1-p3-235")) {
  throw new Error("Refusing to include the p3-235 false positive in the A18 correction manifest");
}

const jsonl = prepareJsonl();
const outputs = [
  { filePath: jsonlPath, content: jsonl.content },
  { filePath: csvPath, content: prepareCsv(jsonl.rows) },
  { filePath: coordinationPackPath, content: preparePack(coordinationPackPath, "coordination question-pack") },
  { filePath: productionPackPath, content: preparePack(productionPackPath, "production question-pack") },
  ...syncHjbPrimaryA18TargetBatches(jsonl.rows, batchDir, { write: false })
];

if (new Set(outputs.map(({ filePath }) => filePath)).size !== 34) {
  throw new Error(`Expected four durable artifacts plus 30 batch caches; prepared ${outputs.length} outputs`);
}

for (const { filePath, content } of outputs) atomicWrite(filePath, content);

console.log(JSON.stringify({ correctedIds: hjbPrimaryA18CorrectionIds.length, writtenFiles: outputs.length }));
