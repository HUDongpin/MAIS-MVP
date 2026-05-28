import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JSONL_PATH = path.join(__dirname, "questions.jsonl");
const CSV_PATH = path.join(__dirname, "questions.csv");

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

function readJsonl(filePath) {
  return fs
    .readFileSync(filePath, "utf8")
    .trim()
    .split(/\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
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

const fixes = {
  "pep-primary-p1-lower-004": (row) => ({
    ...row,
    optionsZhHans: ["够，还剩2元5角", "不够，差5角", "刚好够", "不够，差1元"],
    answer: "够，还剩2元5角",
    acceptedAnswers: ["够，还剩2元5角", "够，还剩2.5元"],
    explanationZhHans:
      "小华的钱：1张5元是5元，2张1元是2元，3枚5角是1元5角，总共8元5角。笔记本6元，8元5角 - 6元 = 2元5角，所以钱够，还剩2元5角。",
  }),
  "pep-primary-p5-lower-015": (row) => ({
    ...row,
    promptZhHans:
      "下面是某城市2022年1~6月的月平均气温统计图（单位：℃）：1月2℃，2月5℃，3月11℃，4月15℃，5月20℃，6月25℃。请回答：哪个月气温上升最快？上升了多少摄氏度？",
    answer: "3月上升最快，上升了6℃",
    acceptedAnswers: ["3月上升最快，上升了6℃", "3月上升最快，上升了6摄氏度", "3月上升最快，6℃", "3月上升最快，6摄氏度"],
    explanationZhHans:
      "计算相邻月温差：2月比1月上升3℃，3月比2月上升6℃，4月比3月上升4℃，5月比4月上升5℃，6月比5月上升5℃。最大上升幅度是6℃，出现在3月。",
  }),
  "pep-primary-p5-upper-027": (row) => ({
    ...row,
    promptZhHans:
      "学校买了 5 个篮球和 8 个排球，一共用了 530 元。已知一个篮球比一个排球贵 15 元，篮球和排球的单价各是多少元？请写出等量关系，再列方程解答。",
    answer: "篮球单价 50 元，排球单价 35 元",
    acceptedAnswers: ["篮球单价 50 元，排球单价 35 元", "篮球单价50元，排球单价35元", "篮球50元，排球35元", "篮球50 排球35"],
    explanationZhHans:
      "等量关系：5×篮球单价 + 8×排球单价 = 530，篮球单价 = 排球单价 + 15。设排球单价为 x 元，则篮球单价为 x+15 元。列方程：5(x+15)+8x=530，5x+75+8x=530，13x=455，x=35。所以排球单价是35元，篮球单价是35+15=50元。",
  }),
};

const rows = readJsonl(JSONL_PATH);
const seen = new Set(rows.map((row) => row.id));
for (const id of Object.keys(fixes)) {
  if (!seen.has(id)) throw new Error(`Cannot apply blocker fix; missing ${id}`);
}

const fixedRows = rows.map((row) => (fixes[row.id] ? fixes[row.id](row) : row));
fs.writeFileSync(JSONL_PATH, `${fixedRows.map((row) => JSON.stringify(row)).join("\n")}\n`);
writeCsv(fixedRows);

console.log(
  JSON.stringify(
    {
      fixedRows: Object.keys(fixes),
      totalRows: fixedRows.length,
      jsonl: path.relative(process.cwd(), JSONL_PATH),
      csv: path.relative(process.cwd(), CSV_PATH),
    },
    null,
    2,
  ),
);
