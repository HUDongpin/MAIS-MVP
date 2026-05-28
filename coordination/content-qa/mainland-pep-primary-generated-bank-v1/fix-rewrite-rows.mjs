import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JSONL_PATH = path.join(__dirname, "questions.jsonl");
const CSV_PATH = path.join(__dirname, "questions.csv");
const BATCHES_DIR = path.join(__dirname, "batches");

const CSV_HEADERS = [
  "id",
  "grade",
  "semester",
  "unitTitle",
  "conceptIds",
  "difficulty",
  "type",
  "promptZhHans",
  "optionsZhHans",
  "answer",
  "acceptedAnswers",
  "explanationZhHans",
  "evidenceCardIds",
  "examPatternCardIds",
  "materialKind",
  "assessmentFamily",
  "sourceDistanceStatus",
  "mathQaStatus",
  "terminologyQaStatus",
  "reviewNotes",
];

const fixes = {
  "pep-primary-p1-lower-011": (row) => ({
    ...row,
    promptZhHans: "小芳用4个完全一样的正方形纸片拼图形。请写出一种一定能拼成长方形的拼法。",
    answer: "把4个正方形排成一排",
    acceptedAnswers: ["把4个正方形排成一排", "排成一排", "4个正方形排成一排", "把四个正方形排成一排"],
    explanationZhHans:
      "把4个正方形排成一排，拼出的图形有4条边，对边相等，4个角都是直角，所以一定是一个长方形。",
  }),
  "pep-primary-p1-lower-029": (row) => ({
    ...row,
    promptZhHans:
      "下表是一（1）班同学最喜欢的水果情况：\n苹果：8人，香蕉：5人，草莓：12人，西瓜：9人。\n最喜欢草莓的人数比最喜欢苹果的多几人？",
    explanationZhHans: "草莓12人，苹果8人，12-8=4（人），所以最喜欢草莓的人数比最喜欢苹果的多4人。",
  }),
  "pep-primary-p2-upper-003": (row) => ({
    ...row,
    promptZhHans:
      "一个三角形有3个角。现在用一条直线连接其中一个角两边上的两个点，剪去这个小角，剩下的图形有几个角？画一画或写一写你的想法。",
    answer: "4个角",
    acceptedAnswers: ["4个角", "4", "四个角"],
    explanationZhHans:
      "这条剪线会把原来的一个角剪掉，同时在剪口处形成两个新角；另外两个角还保留着。所以剩下的图形有2个原来的角和2个新角，一共4个角。",
  }),
  "pep-primary-p2-upper-040": (row) => ({
    ...row,
    promptZhHans: "计算5×3时，小明说：“5×3就是5+3。”这个想法是正确还是错误？请填写“正确”或“错误”。",
    answer: "错误",
    acceptedAnswers: ["错误", "错", "不正确"],
    explanationZhHans:
      "5×3表示3个5相加，也就是5+5+5；也可以理解为5个3相加。5+3只是把5和3相加，不是5×3的意思，所以这个想法是错误的。",
  }),
  "pep-primary-p4-lower-024": (row) => ({
    ...row,
    answer: "按角分类是锐角三角形，按边分类是等腰三角形。",
    acceptedAnswers: [
      "按角分类是锐角三角形，按边分类是等腰三角形。",
      "锐角三角形；等腰三角形",
      "锐角三角形，等腰三角形",
    ],
    explanationZhHans:
      "轴对称三角形是等腰三角形。设两个相等的底角为a，顶角为b，则2a+b=180°。若题目中和为110°的是两个相等的底角，则a=55°，b=70°；若和为110°的是一个底角和顶角，则a+b=110°，结合2a+b=180°可得a=70°、b=40°。两种情况下三个角都小于90°，所以按角分类都是锐角三角形，按边分类都是等腰三角形。",
  }),
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readJsonl(filePath) {
  return fs
    .readFileSync(filePath, "utf8")
    .trim()
    .split(/\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function writeJsonl(filePath, rows) {
  fs.writeFileSync(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  if (/[",\r\n]/.test(text)) return `"${text.replace(/"/g, '""').replace(/\r?\n/g, "\\n")}"`;
  return text;
}

function writeCsv(rows) {
  const lines = [
    CSV_HEADERS.join(","),
    ...rows.map((row) => CSV_HEADERS.map((header) => csvEscape(row[header])).join(",")),
  ];
  fs.writeFileSync(CSV_PATH, `${lines.join("\n")}\n`);
}

function batchPathFor(row) {
  const questionNumber = Number(row.id.split("-").at(-1));
  if (!Number.isInteger(questionNumber)) throw new Error(`Cannot parse question number from ${row.id}`);
  const batchNumber = Math.ceil(questionNumber / 10);
  return path.join(BATCHES_DIR, `${row.grade}-${row.semester}-0${batchNumber}.json`);
}

function applyFix(row) {
  return fixes[row.id] ? fixes[row.id](row) : row;
}

const rows = readJsonl(JSONL_PATH);
const rowIds = new Set(rows.map((row) => row.id));
for (const id of Object.keys(fixes)) {
  if (!rowIds.has(id)) throw new Error(`Cannot apply rewrite-row fix; missing ${id}`);
}

const fixedRows = rows.map(applyFix);
writeJsonl(JSONL_PATH, fixedRows);
writeCsv(fixedRows);

const fixedById = new Map(fixedRows.map((row) => [row.id, row]));
const touchedBatchPaths = new Set(Object.keys(fixes).map((id) => batchPathFor(fixedById.get(id))));
for (const batchPath of touchedBatchPaths) {
  const batch = readJson(batchPath);
  const before = JSON.stringify(batch);
  batch.questions = batch.questions.map((row) => applyFix(row));
  const after = JSON.stringify(batch);
  if (before !== after) fs.writeFileSync(batchPath, `${JSON.stringify(batch, null, 2)}\n`);
}

console.log(
  JSON.stringify(
    {
      fixedRows: Object.keys(fixes),
      touchedBatches: Array.from(touchedBatchPaths).map((item) => path.relative(process.cwd(), item)),
      jsonl: path.relative(process.cwd(), JSONL_PATH),
      csv: path.relative(process.cwd(), CSV_PATH),
      totalRows: fixedRows.length,
    },
    null,
    2,
  ),
);
