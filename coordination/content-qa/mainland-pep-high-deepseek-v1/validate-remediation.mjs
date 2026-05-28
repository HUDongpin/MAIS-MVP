import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QUESTIONS_JSONL = path.join(__dirname, "questions.remediated.jsonl");
const AUDIT_JSON = path.join(__dirname, "solvability-audit.json");
const MANUAL_RESULTS_CSV = path.join(__dirname, "manual-review-results.csv");
const REJECT_RESULTS_CSV = path.join(__dirname, "reject-remediation-results.csv");

const bannedByTopic = {
  "pep-high-s4-complex-numbers": /导数|切线斜率|极小值|极大值|圆锥曲线|随机变量|排列|组合/,
  "pep-high-s4-sets-logic": /导数|切线斜率|极小值|极大值|圆锥曲线|空间向量|随机变量/,
  "pep-high-s4-plane-vectors": /空间向量|圆锥曲线|随机变量|导数|对数函数/,
  "pep-high-s4-exp-log": /圆锥曲线|空间向量|随机变量|排列|组合|导数/,
  "pep-high-s4-function-properties": /导数|切线斜率|圆锥曲线|空间向量|随机变量/,
  "pep-high-s4-quadratic-inequalities": /导数|圆锥曲线|空间向量|随机变量|复数/,
  "pep-high-s4-trigonometry": /导数|圆锥曲线|空间向量|随机变量|对数函数/
};

function readJsonl(filePath) {
  return fs.readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === "\"" && text[index + 1] === "\"") {
        field += "\"";
        index += 1;
      } else if (char === "\"") {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === "\"") {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const headers = rows.shift() ?? [];
  return rows
    .filter((values) => values.length === headers.length)
    .map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index]])));
}

function normalizePrompt(value) {
  return String(value ?? "")
    .replace(/[！-～]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/\s+/g, "")
    .replace(/[，、；;：:。！？?!（）()【】\[\]{}“”"‘’'`]/g, "")
    .toLowerCase();
}

function fail(message) {
  throw new Error(message);
}

const questions = readJsonl(QUESTIONS_JSONL);
const audit = JSON.parse(fs.readFileSync(AUDIT_JSON, "utf8"));
const manualRows = parseCsv(fs.readFileSync(MANUAL_RESULTS_CSV, "utf8"));
const rejectRows = parseCsv(fs.readFileSync(REJECT_RESULTS_CSV, "utf8"));

if (questions.length !== 490) fail(`expected 490 remediated rows, got ${questions.length}`);
if (new Set(questions.map((row) => row.id)).size !== questions.length) fail("duplicate IDs found");
if (new Set(questions.map((row) => normalizePrompt(row.promptZhHans))).size !== questions.length) fail("exact prompt duplicates found");

for (const row of questions) {
  const text = [row.promptZhHans, row.answer, row.explanationZhHans, ...(row.optionsZhHans ?? [])].join("\n");
  if (bannedByTopic[row.topicId]?.test(text)) fail(`${row.id} has banned later-course wording`);
  if (row.type === "multiple-choice") {
    if (!Array.isArray(row.optionsZhHans) || row.optionsZhHans.length !== 4) fail(`${row.id} invalid MC options`);
    if (new Set(row.optionsZhHans.map(normalizePrompt)).size !== 4) fail(`${row.id} duplicate MC options`);
    if (!row.optionsZhHans.includes(row.answer)) fail(`${row.id} answer not in MC options`);
  } else if (Array.isArray(row.optionsZhHans) && row.optionsZhHans.length > 0) {
    fail(`${row.id} non-choice row has options`);
  }
  if (!Array.isArray(row.acceptedAnswers) || !row.acceptedAnswers.includes(row.answer)) fail(`${row.id} acceptedAnswers missing answer`);
  if (!normalizePrompt(row.explanationZhHans).includes(normalizePrompt(row.answer))) fail(`${row.id} answer not visible in explanation`);
  if (row.mathQaStatus !== "pending-teacher-signoff") fail(`${row.id} missing pending teacher signoff status`);
}

if (audit.summary.releaseDecision !== "partial-candidate-review-ready") fail(`unexpected audit decision ${audit.summary.releaseDecision}`);
if (audit.summary.blockerRows !== 0) fail(`audit blockerRows should be 0, got ${audit.summary.blockerRows}`);
if (audit.summary.pendingTeacherSignoffRows !== 490) fail(`audit pendingTeacherSignoffRows should be 490, got ${audit.summary.pendingTeacherSignoffRows}`);

const manualVerdicts = manualRows.reduce((counts, row) => {
  counts[row.verdict] = (counts[row.verdict] ?? 0) + 1;
  return counts;
}, {});
if ((manualVerdicts.reject ?? 0) !== 0) fail("manual reject rows remain");
if ((manualVerdicts["rewrite-required"] ?? 0) !== 0) fail("manual rewrite-required rows remain");
if ((manualVerdicts["pending-teacher-signoff"] ?? 0) !== 490) fail("manual pending teacher signoff count is not 490");
if (rejectRows.length !== 39) fail(`expected 39 reject remediation rows, got ${rejectRows.length}`);

console.log(JSON.stringify({
  remediatedRows: questions.length,
  manualVerdicts,
  auditDecision: audit.summary.releaseDecision,
  auditBlockerRows: audit.summary.blockerRows,
  rejectRemediationRows: rejectRows.length
}, null, 2));
