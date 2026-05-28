import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const batchDir = path.join(__dirname, "batches");
const questionsJsonl = path.join(__dirname, "questions.jsonl");
const batchSize = 5;

const rows = fs.readFileSync(questionsJsonl, "utf8").trim().split(/\n/).filter(Boolean).map((line) => JSON.parse(line));

if (rows.length % batchSize !== 0) {
  throw new Error(`Expected row count divisible by ${batchSize}; got ${rows.length}.`);
}

let written = 0;
for (let index = 0; index < rows.length; index += batchSize) {
  const batchNumber = index / batchSize + 1;
  const batchId = `batch-${String(batchNumber).padStart(3, "0")}`;
  const filePath = path.join(batchDir, `${batchId}.json`);
  const batch = {
    batchId,
    questions: rows.slice(index, index + batchSize),
  };
  fs.writeFileSync(filePath, `${JSON.stringify(batch, null, 2)}\n`);
  written += 1;
}

console.log(`Rebuilt ${written} batch cache files from questions.jsonl.`);
