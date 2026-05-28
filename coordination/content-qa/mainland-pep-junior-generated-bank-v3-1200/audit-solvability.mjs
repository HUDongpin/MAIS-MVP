import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const inputJsonl = path.join(__dirname, "questions.jsonl");
const priorBankJsonl = path.join(rootDir, "coordination/content-qa/mainland-pep-junior-generated-bank-v2-1200/questions.jsonl");

const outputFiles = {
  json: path.join(__dirname, "solvability-audit.json"),
  csv: path.join(__dirname, "solvability-audit.csv"),
  md: path.join(__dirname, "solvability-audit.md"),
  queue: path.join(__dirname, "manual-review-queue.csv")
};

const expectedBatch = "junior-rag-v3-1200";
const expectedTotal = 1200;
const questionTypes = ["multiple-choice", "fill-in", "short-answer"];
const gradeOrder = ["S1", "S2", "S3"];
const typeQuotasByGradeSemester = {
  S1: {
    upper: { "multiple-choice": 67, "fill-in": 67, "short-answer": 66 },
    lower: { "multiple-choice": 67, "fill-in": 66, "short-answer": 67 }
  },
  S2: {
    upper: { "multiple-choice": 67, "fill-in": 67, "short-answer": 66 },
    lower: { "multiple-choice": 66, "fill-in": 67, "short-answer": 67 }
  },
  S3: {
    upper: { "multiple-choice": 67, "fill-in": 66, "short-answer": 67 },
    lower: { "multiple-choice": 66, "fill-in": 67, "short-answer": 67 }
  }
};
const difficultyQuotasByGrade = {
  S1: { Foundation: 130, Core: 210, Exam: 50, Challenge: 10 },
  S2: { Foundation: 70, Core: 230, Exam: 80, Challenge: 20 },
  S3: { Foundation: 30, Core: 170, Exam: 150, Challenge: 50 }
};
const requiredFields = [
  "id",
  "batch",
  "grade",
  "semester",
  "knowledgePointId",
  "unitTitle",
  "type",
  "difficulty",
  "promptZhHans",
  "optionsZhHans",
  "answer",
  "acceptedAnswers",
  "explanationZhHans",
  "evidenceCardIds",
  "paperPatternCardIds",
  "examPatternCardIds",
  "sourceDistanceStatus",
  "mathQaStatus",
  "reviewNotes"
];
const forbiddenPatterns = [
  { code: "source-original", regex: /原题|原卷|原教材|教材原文|课本原文|答案原句|照抄|改编自|来源于/ },
  { code: "source-ocr", regex: /\bOCR\b|光学字符识别|识别文本/i },
  { code: "source-page", regex: /第\s*\d+\s*页|页码|页\s*\d+|P\.\s*\d+/i },
  { code: "source-file", regex: /\.pdf\b|\.docx\b|\.zip\b|\.jpg\b|\.png\b|文件名|路径|source locator|archive path/i },
  { code: "missing-visual", regex: /如图|见图|下图|上图|右图|左图|图中|根据图|观察下面的图/ },
  { code: "self-contradiction", regex: /选项中没有|题目有误|无法确定|不够条件|缺少图|缺少信息|重新计算|重新审查|重新生成|上面算错|答案写错|之前答案|前后[^。；;]*不一致|失误|无法撤回|最终输出|已输出|修正/ }
];

function loadTsExport(filePath, exportName) {
  const source = fs
    .readFileSync(filePath, "utf8")
    .replace(/^import\s+type\s+.*;\s*$/gm, "")
    .replace(/const\s+([A-Za-z0-9_]+):\s*[^=]+=/g, "const $1 =")
    .replace(new RegExp(`export const ${exportName}: [^=]+ =`), `exports.${exportName} =`)
    .replace(new RegExp(`export const ${exportName}\\s*=`), `exports.${exportName} =`);
  const context = { exports: {} };
  vm.runInNewContext(source, context, { filename: filePath });
  return context.exports[exportName];
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const text = fs.readFileSync(filePath, "utf8").trim();
  if (!text) return [];
  return text
    .split(/\n/)
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        return { id: `__parse_error_${index + 1}`, parseError: String(error), rawLine: line };
      }
    });
}

function csvEscape(value) {
  const text = (Array.isArray(value) ? value.join(" | ") : String(value ?? "")).replace(/\s*\r?\n\s*/g, " ");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(filePath, rows, columns) {
  const lines = [columns.join(","), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = typeof keyFn === "function" ? keyFn(row) : row[keyFn];
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "$1/$2")
    .replace(/[，、；;：:。！？?!（）()【】\[\]{}“”"‘’' \t\r\n]/g, "")
    .replace(/−|－/g, "-")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/平方厘米/g, "cm2")
    .replace(/立方厘米/g, "cm3")
    .replace(/厘米/g, "cm")
    .replace(/米/g, "m")
    .replace(/摄氏度/g, "℃")
    .replace(/度/g, "°");
}

function normalizePrompt(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[，。！？、；：“”‘’（）()【】\[\]{}]/g, "");
}

function rowText(row) {
  return [
    row.promptZhHans,
    Array.isArray(row.optionsZhHans) ? row.optionsZhHans.join(" ") : "",
    row.answer,
    Array.isArray(row.acceptedAnswers) ? row.acceptedAnswers.join(" ") : "",
    row.explanationZhHans
  ].join(" ");
}

function mathRiskText(row) {
  return [row.promptZhHans, row.answer, row.explanationZhHans].join(" ");
}

function splitQuota(total, count) {
  const base = Math.floor(total / count);
  const remainder = total % count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

function topicTypeQuotaKey(topicId, type) {
  return `${topicId}:${type}`;
}

function buildTopicTypeQuotas(curriculumCards) {
  const quotas = new Map();
  gradeOrder.forEach((grade) => {
    ["upper", "lower"].forEach((semester) => {
      const semesterCards = curriculumCards.filter((card) => card.grade === grade && card.semester === semester);
      const semesterTypeQuotas = typeQuotasByGradeSemester[grade]?.[semester];
      if (!semesterCards.length || !semesterTypeQuotas) return;
      questionTypes.forEach((type) => {
        splitQuota(semesterTypeQuotas[type], semesterCards.length).forEach((quota, index) => {
          quotas.set(topicTypeQuotaKey(semesterCards[index].id, type), quota);
        });
      });
    });
  });
  return quotas;
}

function answerSupported(row) {
  if (row.type === "multiple-choice") return true;
  const explanation = normalize(row.explanationZhHans);
  const candidates = [row.answer, ...(Array.isArray(row.acceptedAnswers) ? row.acceptedAnswers : [])]
    .map(normalize)
    .filter(Boolean)
    .sort((left, right) => right.length - left.length);
  return candidates.some((answer) => explanation.includes(answer));
}

function buildPriorContentIndex() {
  const rows = readJsonl(priorBankJsonl);
  return {
    checked: fs.existsSync(priorBankJsonl),
    total: rows.length,
    promptKeys: new Set(rows.map((row) => normalizePrompt(row.promptZhHans)).filter(Boolean)),
    rowKeys: new Set(rows.map((row) => normalizePrompt(rowText(row))).filter(Boolean))
  };
}

function auditRow(row, context) {
  const notes = [];
  const check = (condition, note) => {
    if (!condition) notes.push(note);
  };

  const keys = Object.keys(row).sort();
  const expectedKeys = [...requiredFields].sort();
  check(JSON.stringify(keys) === JSON.stringify(expectedKeys), "field-set-mismatch");
  check(!row.parseError, `parse-error:${row.parseError}`);

  for (const field of requiredFields) check(field in row, `missing-field:${field}`);
  check(/^pep-junior-v3-s[123]-k\d{2}-(mc|fi|sa)-\d{3}$/.test(row.id), "id-not-v3-format");
  check(row.batch === expectedBatch, "wrong-batch");
  check(context.curriculumCardIds.has(row.knowledgePointId), "unknown-curriculum-card");
  check(context.topicTypeQuotas.has(topicTypeQuotaKey(row.knowledgePointId, row.type)), "unexpected-topic-type");
  check(row.grade === context.cardById.get(row.knowledgePointId)?.grade, "grade-topic-mismatch");
  check(row.semester === context.cardById.get(row.knowledgePointId)?.semester, "semester-topic-mismatch");
  check(questionTypes.includes(row.type), "invalid-type");
  check(["Foundation", "Core", "Exam", "Challenge"].includes(row.difficulty), "invalid-difficulty");
  check(row.promptZhHans && row.promptZhHans.trim().length >= 6, "missing-or-short-prompt");
  check(row.answer && row.answer.trim().length > 0, "missing-answer");
  check(row.explanationZhHans && row.explanationZhHans.trim().length >= 6, "missing-or-short-explanation");
  check(Array.isArray(row.acceptedAnswers) && row.acceptedAnswers.length > 0, "missing-accepted-answers");
  check(Array.isArray(row.evidenceCardIds) && row.evidenceCardIds.includes(row.knowledgePointId), "missing-primary-evidence-card");
  check(Array.isArray(row.paperPatternCardIds) && row.paperPatternCardIds.length > 0, "missing-paper-pattern-evidence");
  check(Array.isArray(row.examPatternCardIds) && row.examPatternCardIds.length > 0, "missing-exam-pattern-evidence");
  check((row.paperPatternCardIds ?? []).every((id) => context.paperPatternIds.has(id)), "unknown-paper-pattern-evidence");
  check((row.examPatternCardIds ?? []).every((id) => context.examPatternIds.has(id)), "unknown-exam-pattern-evidence");
  check(row.sourceDistanceStatus === "passed", "source-distance-not-passed");
  check(row.mathQaStatus === "needs-review", "math-qa-status-should-remain-needs-review");
  check(!context.priorIndex.promptKeys.has(normalizePrompt(row.promptZhHans)), "exact-v2-prompt-reuse");
  check(!context.priorIndex.rowKeys.has(normalizePrompt(rowText(row))), "exact-v2-row-content-reuse");
  if (row.type === "multiple-choice") {
    const options = Array.isArray(row.optionsZhHans) ? row.optionsZhHans : [];
    check(options.length === 4, "mc-option-count-not-four");
    check(new Set(options).size === options.length, "mc-options-not-unique");
    check(options.filter((option) => option === row.answer).length === 1, "mc-answer-not-exactly-one-option");
  } else {
    check(Array.isArray(row.optionsZhHans) && row.optionsZhHans.length === 0, "non-mc-has-options");
  }

  for (const pattern of forbiddenPatterns) {
    const text = pattern.code === "self-contradiction" ? mathRiskText(row) : rowText(row);
    if (pattern.regex.test(text)) notes.push(`forbidden:${pattern.code}`);
  }

  return {
    id: row.id,
    grade: row.grade,
    semester: row.semester,
    knowledgePointId: row.knowledgePointId,
    type: row.type,
    difficulty: row.difficulty,
    status: notes.length ? "review-required" : "structure-pass-review-required",
    notes
  };
}

function buildInventoryIssues(rows, auditRows, context) {
  const issues = [];
  if (rows.length !== expectedTotal) issues.push(`Expected ${expectedTotal} rows; found ${rows.length}.`);
  const duplicateIds = rows.length - new Set(rows.map((row) => row.id)).size;
  if (duplicateIds > 0) issues.push(`Found ${duplicateIds} duplicate IDs.`);
  const duplicatePrompts = rows.length - new Set(rows.map((row) => normalizePrompt(row.promptZhHans))).size;
  if (duplicatePrompts > 0) issues.push(`Found ${duplicatePrompts} duplicate prompt(s).`);

  const gradeCounts = countBy(rows, "grade");
  for (const grade of gradeOrder) {
    if ((gradeCounts[grade] ?? 0) !== 400) issues.push(`Expected 400 ${grade} rows; found ${gradeCounts[grade] ?? 0}.`);
    const difficultyCounts = countBy(rows.filter((row) => row.grade === grade), "difficulty");
    for (const [difficulty, expectedCount] of Object.entries(difficultyQuotasByGrade[grade])) {
      if ((difficultyCounts[difficulty] ?? 0) !== expectedCount) {
        issues.push(`Expected ${expectedCount} ${grade} ${difficulty} rows; found ${difficultyCounts[difficulty] ?? 0}.`);
      }
    }
  }

  const typeCounts = countBy(rows, "type");
  for (const type of questionTypes) {
    if ((typeCounts[type] ?? 0) !== 400) issues.push(`Expected 400 ${type} rows; found ${typeCounts[type] ?? 0}.`);
  }

  for (const card of context.curriculumCards) {
    for (const type of questionTypes) {
      const expectedCount = context.topicTypeQuotas.get(topicTypeQuotaKey(card.id, type)) ?? 0;
      const actualCount = rows.filter((row) => row.knowledgePointId === card.id && row.type === type).length;
      if (actualCount !== expectedCount) issues.push(`Expected ${expectedCount} rows for ${card.id}/${type}; found ${actualCount}.`);
    }
  }

  const blockingRows = auditRows.filter((row) => row.status === "review-required");
  if (blockingRows.length) issues.push(`Found ${blockingRows.length} rows requiring structural/source-distance repair before manual math review.`);
  return issues;
}

function buildMarkdown(report) {
  return [
    "# S18 Mainland PEP Junior V3 DeepSeek Candidate Audit",
    "",
    `- Generated at: ${report.generatedAt}`,
    `- Total rows: ${report.summary.totalRows}`,
    `- Batch: ${expectedBatch}`,
    `- Structure-pass, still review-required rows: ${report.summary.structurePassReviewRequiredRows}`,
    `- Repair-required rows: ${report.summary.repairRequiredRows}`,
    `- Exact v2 prompt reuse rows: ${report.summary.exactV2PromptReuseRows}`,
    `- Exact v2 row-content reuse rows: ${report.summary.exactV2RowReuseRows}`,
    `- Inventory issues: ${report.inventoryIssues.length}`,
    "",
    "## Counts",
    "",
    `- Grade counts: ${JSON.stringify(report.summary.gradeCounts)}`,
    `- Type counts: ${JSON.stringify(report.summary.typeCounts)}`,
    `- Difficulty counts: ${JSON.stringify(report.summary.difficultyCounts)}`,
    `- Math QA status counts: ${JSON.stringify(report.summary.mathQaStatusCounts)}`,
    "",
    "## Release Position",
    "",
    report.inventoryIssues.length
      ? "- Red: repair structural/source-distance issues before S18 manual math review or app integration."
      : "- Amber: inventory and structural/source-distance gates pass; all rows remain candidate-only and need S18 manual math sampling before app integration.",
    "",
    "## Inventory Issues",
    "",
    ...(report.inventoryIssues.length ? report.inventoryIssues.map((issue) => `- ${issue}`) : ["- None"]),
    "",
    "## Manual Review Queue",
    "",
    `- Rows in queue: ${report.manualReviewQueue.length}`,
    "- Queue contains all rows because DeepSeek-generated answers are not deterministically proven by this audit."
  ].join("\n");
}

function main() {
  const rows = readJsonl(inputJsonl);
  if (!rows.length) throw new Error(`Missing generated rows at ${inputJsonl}`);
  const curriculumCards = loadTsExport(path.join(rootDir, "data/rag/mainlandPepJunior.ts"), "mainlandPepJuniorRagCards");
  const paperPatterns = loadTsExport(path.join(rootDir, "data/rag/mainlandPepJuniorPaperPatterns.ts"), "mainlandPepJuniorPaperPatternCards");
  const examPatterns = loadTsExport(path.join(rootDir, "data/rag/mainlandJuniorZhongkaoExamPatterns.ts"), "mainlandJuniorZhongkaoExamPatternCards");
  const context = {
    curriculumCards,
    cardById: new Map(curriculumCards.map((card) => [card.id, card])),
    curriculumCardIds: new Set(curriculumCards.map((card) => card.id)),
    paperPatternIds: new Set(paperPatterns.map((card) => card.id)),
    examPatternIds: new Set(examPatterns.map((card) => card.id)),
    topicTypeQuotas: buildTopicTypeQuotas(curriculumCards),
    priorIndex: buildPriorContentIndex()
  };
  const auditRows = rows.map((row) => auditRow(row, context));
  const inventoryIssues = buildInventoryIssues(rows, auditRows, context);
  const manualReviewQueue = rows.map((row) => ({
    id: row.id,
    grade: row.grade,
    semester: row.semester,
    knowledgePointId: row.knowledgePointId,
    type: row.type,
    difficulty: row.difficulty,
    promptZhHans: row.promptZhHans,
    answer: row.answer,
    explanationZhHans: row.explanationZhHans,
    reviewReason: "deepseek-generated-math-pending-s18-review"
  }));
  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalRows: rows.length,
      structurePassReviewRequiredRows: auditRows.filter((row) => row.status === "structure-pass-review-required").length,
      repairRequiredRows: auditRows.filter((row) => row.status === "review-required").length,
      exactV2PromptReuseRows: rows.filter((row) => context.priorIndex.promptKeys.has(normalizePrompt(row.promptZhHans))).length,
      exactV2RowReuseRows: rows.filter((row) => context.priorIndex.rowKeys.has(normalizePrompt(rowText(row)))).length,
      gradeCounts: countBy(rows, "grade"),
      typeCounts: countBy(rows, "type"),
      difficultyCounts: countBy(rows, "difficulty"),
      mathQaStatusCounts: countBy(rows, "mathQaStatus")
    },
    inventoryIssues,
    auditRows,
    repairRows: auditRows.filter((row) => row.status === "review-required"),
    manualReviewQueue
  };

  fs.writeFileSync(outputFiles.json, `${JSON.stringify(report, null, 2)}\n`);
  writeCsv(outputFiles.csv, auditRows, ["id", "grade", "semester", "knowledgePointId", "type", "difficulty", "status", "notes"]);
  writeCsv(outputFiles.queue, manualReviewQueue, [
    "id",
    "grade",
    "semester",
    "knowledgePointId",
    "type",
    "difficulty",
    "promptZhHans",
    "answer",
    "explanationZhHans",
    "reviewReason"
  ]);
  fs.writeFileSync(outputFiles.md, `${buildMarkdown(report)}\n`);
  console.log(
    JSON.stringify(
      {
        totalRows: report.summary.totalRows,
        repairRequiredRows: report.summary.repairRequiredRows,
        inventoryIssues: report.inventoryIssues.length,
        exactV2PromptReuseRows: report.summary.exactV2PromptReuseRows,
        exactV2RowReuseRows: report.summary.exactV2RowReuseRows
      },
      null,
      2
    )
  );
  if (report.inventoryIssues.length) process.exitCode = 1;
}

main();
