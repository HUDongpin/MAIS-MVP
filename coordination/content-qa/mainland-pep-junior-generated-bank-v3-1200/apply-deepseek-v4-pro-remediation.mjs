import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const batchDir = path.join(__dirname, "batches");
const questionsJsonl = path.join(__dirname, "questions.jsonl");
const remediationDir = path.join(__dirname, "deepseek-v4-pro-remediation");
const patchJson = path.join(remediationDir, "deepseek-v4-pro-remediation-patch.json");
const applyReport = path.join(remediationDir, "deepseek-v4-pro-remediation-apply-report.md");

const allowedActions = new Set(["repair", "keep_false_positive"]);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function readJsonl(filePath) {
  return fs
    .readFileSync(filePath, "utf8")
    .trim()
    .split(/\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function batchFileNameForQuestionIndex(index) {
  return `batch-${String(Math.floor(index / 10) + 1).padStart(3, "0")}.json`;
}

function appendNote(existing, note) {
  const parts = String(existing ?? "")
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.includes(note)) parts.push(note);
  return parts.join("; ");
}

function validatePatchItem(item) {
  if (!item?.id) throw new Error("patch item missing id");
  if (!allowedActions.has(item.action)) throw new Error(`invalid action for ${item.id}`);
  if (!item.question || typeof item.question !== "object") throw new Error(`missing question patch for ${item.id}`);
  const q = item.question;
  for (const field of ["promptZhHans", "answer", "explanationZhHans"]) {
    if (typeof q[field] !== "string" || !q[field].trim()) throw new Error(`missing ${field} for ${item.id}`);
  }
  if (!Array.isArray(q.optionsZhHans)) throw new Error(`optionsZhHans must be array for ${item.id}`);
  if (!Array.isArray(q.acceptedAnswers) || !q.acceptedAnswers.length) throw new Error(`acceptedAnswers missing for ${item.id}`);
}

function loadTailFallbackCount() {
  const files = fs
    .readdirSync(path.join(remediationDir, "batches"))
    .filter((name) => /^patch-\d{3}\.json$/.test(name));
  return files.reduce((count, name) => {
    const record = readJson(path.join(remediationDir, "batches", name));
    if (String(record.model ?? "").includes("s18-tail-fallback")) return count + (record.items?.length ?? 0);
    return count;
  }, 0);
}

function main() {
  const patch = readJson(patchJson);
  const patchItems = patch.patchItems ?? [];
  if (!Array.isArray(patchItems) || !patchItems.length) throw new Error("patchItems missing");
  patchItems.forEach(validatePatchItem);
  const patchById = new Map(patchItems.map((item) => [item.id, item]));
  if (patchById.size !== patchItems.length) throw new Error("duplicate ids in remediation patch");

  const questionRows = readJsonl(questionsJsonl);
  const batchFiles = Array.from(
    new Set(
      questionRows
        .map((question, index) => (patchById.has(question.id) ? batchFileNameForQuestionIndex(index) : null))
        .filter(Boolean)
    )
  ).sort();
  const applied = [];
  const missingIds = new Set(patchById.keys());

  console.warn(
    JSON.stringify({
      event: "deepseek-remediation-apply-start",
      patchRows: patchItems.length,
      targetBatchFiles: batchFiles.length
    })
  );
  for (const fileName of batchFiles) {
    console.warn(JSON.stringify({ event: "deepseek-remediation-apply-batch", fileName }));
    const filePath = path.join(batchDir, fileName);
    const record = readJson(filePath);
    let changed = false;
    const questions = (record.questions ?? []).map((question) => {
      const item = patchById.get(question.id);
      if (!item) return question;
      missingIds.delete(question.id);
      changed = true;
      const note = item.action === "repair" ? "deepseek-v4-pro-remediation:repair" : "deepseek-v4-pro-remediation:false-positive";
      const next = {
        ...question,
        mathQaStatus: "needs-review",
        reviewNotes: appendNote(question.reviewNotes, note)
      };
      if (item.action === "repair") {
        next.promptZhHans = item.question.promptZhHans;
        next.optionsZhHans = item.question.optionsZhHans;
        next.answer = item.question.answer;
        next.acceptedAnswers = item.question.acceptedAnswers;
        next.explanationZhHans = item.question.explanationZhHans;
      }
      applied.push({ id: question.id, action: item.action, batchFile: fileName });
      return next;
    });
    if (changed) writeJson(filePath, { ...record, questions });
  }

  if (missingIds.size) throw new Error(`patch ids not found in batch caches: ${Array.from(missingIds).join(", ")}`);

  const actionCounts = applied.reduce((counts, item) => {
    counts[item.action] = (counts[item.action] ?? 0) + 1;
    return counts;
  }, {});
  const touchedBatchCount = new Set(applied.map((item) => item.batchFile)).size;
  console.warn(JSON.stringify({ event: "deepseek-remediation-apply-report", appliedRows: applied.length }));
  const tailFallbackRows = loadTailFallbackCount();

  fs.writeFileSync(
    applyReport,
    [
      "# DeepSeek V4 Pro Remediation Apply Report",
      "",
      `- Applied at: ${new Date().toISOString()}`,
      `- Patch rows: ${patchItems.length}`,
      `- Applied rows: ${applied.length}`,
      `- Touched batch files: ${touchedBatchCount}`,
      `- Action counts: ${JSON.stringify(actionCounts)}`,
      `- S18 tail fallback rows due DeepSeek network timeout: ${tailFallbackRows}`,
      "",
      "This updated only the offline v3 generated-bank batch caches. Regenerate package outputs and rerun deterministic plus DeepSeek QA gates before public integration."
    ].join("\n")
  );

  console.log(
    JSON.stringify({
      event: "deepseek-remediation-applied",
      appliedRows: applied.length,
      touchedBatchCount,
      actionCounts,
      tailFallbackRows,
      reportPath: path.relative(process.cwd(), applyReport)
    })
  );
}

main();
