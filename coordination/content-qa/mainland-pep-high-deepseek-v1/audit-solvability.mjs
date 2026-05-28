import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const batchDir = path.join(__dirname, "batches");
const nodeRequire = createRequire(import.meta.url);

const AUDIT_JSON = path.join(__dirname, "solvability-audit.json");
const AUDIT_CSV = path.join(__dirname, "solvability-audit.csv");
const AUDIT_MD = path.join(__dirname, "solvability-audit.md");
const MANUAL_QUEUE_CSV = path.join(__dirname, "manual-review-queue.csv");
const RELEASE_DECISION_MD = path.join(__dirname, "qa-release-decision.md");

const grades = ["S4", "S5", "S6"];
const allowedTypes = ["multiple-choice", "fill-in", "short-answer"];
const allowedDifficulties = ["Foundation", "Core", "Challenge", "Exam"];
const expectedTotal = 2100;
const expectedGradeCounts = { S4: 700, S5: 700, S6: 700 };
const expectedTopicCounts = { S4: 70, S5: 140, S6: 100 };
const expectedTypeCountsByGrade = {
  S4: { "multiple-choice": 210, "fill-in": 210, "short-answer": 280 },
  S5: { "multiple-choice": 210, "fill-in": 210, "short-answer": 280 },
  S6: { "multiple-choice": 210, "fill-in": 210, "short-answer": 280 }
};
const expectedDifficultyCountsByGrade = {
  S4: { Foundation: 140, Core: 315, Challenge: 175, Exam: 70 },
  S5: { Foundation: 105, Core: 280, Challenge: 210, Exam: 105 },
  S6: { Foundation: 70, Core: 210, Challenge: 245, Exam: 175 }
};

const requiredFields = [
  "id",
  "grade",
  "topicId",
  "topicTitleZhHans",
  "chapter",
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
  "sourceDistanceStatus",
  "mathQaStatus",
  "terminologyQaStatus",
  "reviewNotes"
];

const forbiddenSourcePatterns = [
  { code: "source-ocr", regex: /\bOCR\b|光学字符识别|识别文本/i },
  { code: "source-screenshot", regex: /截图|截屏|扫描图|扫描件|图片来源|教材图片/ },
  { code: "source-page", regex: /第\s*\d+\s*页|页码|页\s*\d+|P\.\s*\d+/i },
  { code: "source-original", regex: /教材原题|课本原题|试卷原题|高考真题|官方解析|答案原句|教材原文|课本原文|照抄|改编自|来源于/ },
  { code: "source-file", regex: /\.pdf\b|\.docx\b|\.zip\b|\.jpg\b|\.png\b|文件名|路径|source locator/iu },
  { code: "missing-visual", regex: /如图(?:所示)?|见图|下图|上图|右图|左图|(?:^|[，。；：:\s])图中|根据图(?:形|表|像)?|观察下面的图/ }
];

const mathRedFlagPatterns = [
  { code: "self-correction", regex: /重新计算|上面算错|前面错误|但选项|但题目|题目误写|题目有误|答案有误|原答案有误|选项应改|应改为|重新生成/ },
  { code: "under-specified", regex: /条件不足|无法确定|答案不唯一|不够条件|缺少图|缺少信息|选项中没有/ },
  { code: "model-artifact", regex: /作为AI|模型|抱歉|根据输出要求|不能指出题目错误/ }
];

function loadTsModule(filePath, cache = new Map()) {
  const resolvedPath = filePath.endsWith(".ts") ? filePath : `${filePath}.ts`;
  if (cache.has(resolvedPath)) return cache.get(resolvedPath).exports;

  const source = fs.readFileSync(resolvedPath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022
    },
    fileName: resolvedPath
  }).outputText;

  const module = { exports: {} };
  cache.set(resolvedPath, module);

  function localRequire(specifier) {
    if (specifier.startsWith("@/types")) return {};
    if (specifier.startsWith("@/")) return loadTsModule(path.join(rootDir, `${specifier.slice(2)}.ts`), cache);
    if (specifier.startsWith(".")) return loadTsModule(path.resolve(path.dirname(resolvedPath), specifier), cache);
    return nodeRequire(specifier);
  }

  const wrapped = `(function (exports, require, module, __filename, __dirname) {\n${compiled}\n})`;
  const fn = vm.runInNewContext(wrapped, { console, URL, Intl, setTimeout, clearTimeout }, { filename: resolvedPath });
  fn(module.exports, localRequire, module, resolvedPath, path.dirname(resolvedPath));
  return module.exports;
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function slugForTopic(topicId) {
  return topicId.replace(/^pep-high-/, "").replace(/[^a-z0-9-]/gi, "-").toLowerCase();
}

function countBy(rows, keyFn) {
  const counts = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function objectFromCounts(counts) {
  return Object.fromEntries(Array.from(counts.entries()).sort(([a], [b]) => String(a).localeCompare(String(b))));
}

function normalizeText(value) {
  return String(value ?? "")
    .replace(/[！-～]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/　/g, " ")
    .replace(/\s+/g, "")
    .replace(/[，、；;：:。！？?!（）()【】\[\]{}“”"‘’'`]/g, "")
    .replace(/−/g, "-")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .toLowerCase();
}

function normalizePrompt(value) {
  return normalizeText(value);
}

function canonicalPrompt(value) {
  return normalizePrompt(value)
    .replace(/[0-9]+(?:\.[0-9]+)?/g, "#")
    .replace(/[一二三四五六七八九十百千万]+/g, "中数")
    .replace(/[a-d][.．、]/g, "");
}

function sourceRiskText(row) {
  return [
    row.promptZhHans,
    ...(Array.isArray(row.optionsZhHans) ? row.optionsZhHans : []),
    row.answer,
    ...(Array.isArray(row.acceptedAnswers) ? row.acceptedAnswers : []),
    row.explanationZhHans,
    row.reviewNotes
  ].join("\n");
}

function contentRiskText(row) {
  return [
    row.promptZhHans,
    row.answer,
    ...(Array.isArray(row.acceptedAnswers) ? row.acceptedAnswers : []),
    row.explanationZhHans,
    row.reviewNotes
  ].join("\n");
}

function readJsonl(filePath) {
  return fs.readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        return { id: `__parse_error_${index + 1}`, __parseError: String(error), __rawLine: line };
      }
    });
}

function readCandidates() {
  const remediatedJsonl = path.join(__dirname, "questions.remediated.jsonl");
  const fullJsonl = path.join(__dirname, "questions.jsonl");
  const partialJsonl = path.join(__dirname, "questions.partial.jsonl");
  if (fs.existsSync(remediatedJsonl)) return { source: "questions.remediated.jsonl", rows: readJsonl(remediatedJsonl) };
  if (fs.existsSync(fullJsonl)) return { source: "questions.jsonl", rows: readJsonl(fullJsonl) };
  if (fs.existsSync(partialJsonl)) return { source: "questions.partial.jsonl", rows: readJsonl(partialJsonl) };
  const files = fs.existsSync(batchDir) ? fs.readdirSync(batchDir).filter((file) => file.endsWith(".json")).sort() : [];
  const rows = files.flatMap((file) => {
    const parsed = JSON.parse(fs.readFileSync(path.join(batchDir, file), "utf8"));
    return (parsed.questions ?? []).map((question) => ({ ...question, __batchFile: file }));
  });
  return { source: "batches", rows };
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  return `"${text.replace(/"/g, '""').replace(/\r?\n/g, "\\n")}"`;
}

function writeCsv(filePath, rows, headers) {
  const lines = [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))
  ];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function expectedPlan(topics) {
  const rows = [];
  for (const topic of topics.filter((topic) => grades.includes(topic.grade))) {
    const count = expectedTopicCounts[topic.grade];
    for (let index = 1; index <= count; index += 1) {
      rows.push({
        id: `pep-high-ds-v1-${slugForTopic(topic.id)}-${String(index).padStart(3, "0")}`,
        grade: topic.grade,
        topicId: topic.id,
        topicTitleZhHans: topic.title.zh,
        expectedTopicCount: count
      });
    }
  }
  return rows;
}

function existingHighPromptSet() {
  const module = loadTsModule(path.join(rootDir, "data/mainlandPepHighQuestions.ts"));
  const rows = [
    ...(module.mainlandPepHighQuestions ?? []),
    ...(module.mainlandPepHighRagV4CandidateQuestions ?? [])
  ];
  return new Set(rows.map((question) => normalizePrompt(question.prompt?.zh)));
}

function topicExpectedConcepts(topic, ragCards) {
  const chapterCards = ragCards.filter((card) => card.chapter === topic.title.zh);
  return unique(chapterCards.flatMap((card) => card.conceptIds));
}

function hasConceptOverlap(left = [], right = []) {
  const rightSet = new Set(right);
  return left.some((value) => rightSet.has(value));
}

function optionIdentities(options) {
  return options.map((option) => normalizeText(option));
}

function assessStructure(row) {
  const flags = [];
  if (!allowedTypes.includes(row.type)) flags.push("invalid-type");
  if (!allowedDifficulties.includes(row.difficulty)) flags.push("invalid-difficulty");
  for (const field of requiredFields) {
    if (!(field in row)) flags.push(`missing-field:${field}`);
  }
  if (!String(row.promptZhHans ?? "").trim()) flags.push("missing-prompt");
  if (!String(row.answer ?? "").trim()) flags.push("missing-answer");
  if (!String(row.explanationZhHans ?? "").trim()) flags.push("missing-explanation");
  if (!Array.isArray(row.conceptIds) || row.conceptIds.length === 0) flags.push("missing-concept-ids");
  if (!Array.isArray(row.evidenceCardIds) || row.evidenceCardIds.length === 0) flags.push("missing-evidence-card");
  if (!Array.isArray(row.examPatternCardIds) || row.examPatternCardIds.length === 0) flags.push("missing-exam-pattern-card");
  if (!Array.isArray(row.acceptedAnswers) || row.acceptedAnswers.length === 0) {
    flags.push("missing-accepted-answers");
  } else if (!row.acceptedAnswers.includes(row.answer)) {
    flags.push("accepted-answers-missing-canonical-answer");
  }

  if (row.type === "multiple-choice") {
    const options = Array.isArray(row.optionsZhHans) ? row.optionsZhHans : [];
    if (options.length !== 4) flags.push("multiple-choice-option-count");
    if (new Set(optionIdentities(options)).size !== options.length) flags.push("duplicate-options");
    if (options.filter((option) => option === row.answer).length !== 1) flags.push("multiple-choice-answer-not-unique");
  } else if (Array.isArray(row.optionsZhHans) && row.optionsZhHans.length > 0) {
    flags.push("non-choice-has-options");
  }
  return flags;
}

function assessSourceSafety(row) {
  const text = sourceRiskText(row);
  return forbiddenSourcePatterns.filter((item) => item.regex.test(text)).map((item) => item.code);
}

function assessContentSafety(row) {
  const text = contentRiskText(row);
  return mathRedFlagPatterns.filter((item) => item.regex.test(text)).map((item) => item.code);
}

function assessRagAlignment(row, context) {
  const flags = [];
  const topic = context.topicById.get(row.topicId);
  if (!topic) {
    flags.push("unknown-topic");
    return flags;
  }
  if (row.grade !== topic.grade) flags.push("grade-topic-mismatch");
  if (row.topicTitleZhHans !== topic.title.zh) flags.push("topic-title-mismatch");

  const expectedConcepts = context.topicConcepts.get(row.topicId) ?? [];
  const rowConcepts = Array.isArray(row.conceptIds) ? row.conceptIds : [];
  if (expectedConcepts.length && !hasConceptOverlap(rowConcepts, expectedConcepts)) flags.push("row-concepts-do-not-match-topic");

  const evidenceIds = Array.isArray(row.evidenceCardIds) ? row.evidenceCardIds : [];
  const patternIds = Array.isArray(row.examPatternCardIds) ? row.examPatternCardIds : [];
  for (const cardId of evidenceIds) {
    const card = context.ragCardById.get(cardId);
    if (!card) {
      flags.push(`unknown-rag-card:${cardId}`);
      continue;
    }
    if (card.chapter !== row.chapter && !hasConceptOverlap(card.conceptIds, expectedConcepts)) {
      flags.push(`rag-card-topic-mismatch:${cardId}`);
    }
  }
  for (const cardId of patternIds) {
    if (String(cardId).startsWith("s18-remediation-")) continue;
    const card = context.patternCardById.get(cardId);
    if (!card) {
      flags.push(`unknown-exam-pattern-card:${cardId}`);
      continue;
    }
    if (card.chapter !== row.chapter && !hasConceptOverlap(card.conceptIds, expectedConcepts)) {
      flags.push(`exam-pattern-topic-mismatch:${cardId}`);
    }
  }
  return flags;
}

function deterministicMathCheck(row) {
  // DeepSeek free-form high-school items are intentionally not graded by another LLM.
  // Keep this conservative: only detect direct answer/explanation contradictions.
  if (row.mathQaStatus === "pending-teacher-signoff") {
    return { status: "pending-teacher-signoff", notes: ["requires-teacher-signoff"] };
  }
  const answer = normalizeText(row.answer);
  const explanation = normalizeText(row.explanationZhHans);
  if (!answer || !explanation) return { status: "solver-gap", notes: ["manual-review-required"] };
  if (answer.length >= 2 && !explanation.includes(answer) && row.type !== "multiple-choice") {
    return { status: "solver-gap", notes: ["answer-not-explicitly-visible-in-explanation"] };
  }
  return { status: "solver-gap", notes: ["no-safe-deterministic-solver-for-freeform-high-school-item"] };
}

function rowStatus({ structureFlags, sourceFlags, contentFlags, ragFlags, duplicateFlags, mathCheck }) {
  if (structureFlags.length) return "structure-error";
  if (sourceFlags.length) return "source-risk";
  if (contentFlags.length) return "content-risk";
  if (ragFlags.length) return "rag-mismatch";
  if (duplicateFlags.length) return "duplicate-risk";
  if (mathCheck.status === "answer-mismatch") return "answer-mismatch";
  if (mathCheck.status === "pending-teacher-signoff") return "pending-teacher-signoff";
  if (mathCheck.status === "pass") return "pass";
  return "solver-gap";
}

function rowSeverity(status) {
  if (["structure-error", "source-risk", "content-risk", "rag-mismatch", "answer-mismatch"].includes(status)) return "P1";
  if (status === "duplicate-risk") return "P2";
  if (status === "solver-gap") return "P2";
  if (status === "pending-teacher-signoff") return "none";
  return "none";
}

function buildRows(candidates, context) {
  const promptCounts = countBy(candidates, (row) => normalizePrompt(row.promptZhHans));
  const canonicalCounts = countBy(candidates, (row) => canonicalPrompt(row.promptZhHans));
  return candidates.map((row) => {
    const duplicateFlags = [];
    const normalizedPrompt = normalizePrompt(row.promptZhHans);
    if (normalizedPrompt && (promptCounts.get(normalizedPrompt) ?? 0) > 1) duplicateFlags.push("candidate-exact-prompt-duplicate");
    if (normalizedPrompt && context.existingPrompts.has(normalizedPrompt)) duplicateFlags.push("existing-bank-exact-prompt-duplicate");
    if ((canonicalCounts.get(canonicalPrompt(row.promptZhHans)) ?? 0) > 10) duplicateFlags.push("near-template-cluster");

    const structureFlags = assessStructure(row);
    const sourceFlags = assessSourceSafety(row);
    const contentFlags = assessContentSafety(row);
    const ragFlags = assessRagAlignment(row, context);
    const mathCheck = deterministicMathCheck(row);
    const status = rowStatus({ structureFlags, sourceFlags, contentFlags, ragFlags, duplicateFlags, mathCheck });
    const severity = rowSeverity(status);

    return {
      questionId: row.id,
      grade: row.grade,
      topicId: row.topicId,
      type: row.type,
      difficulty: row.difficulty,
      status,
      severity,
      structureFlags,
      sourceFlags,
      contentFlags,
      ragFlags,
      duplicateFlags,
      mathStatus: mathCheck.status,
      mathNotes: mathCheck.notes,
      evidenceCardIds: Array.isArray(row.evidenceCardIds) ? row.evidenceCardIds : [],
      examPatternCardIds: Array.isArray(row.examPatternCardIds) ? row.examPatternCardIds : [],
      promptZhHans: row.promptZhHans,
      answer: row.answer,
      acceptedAnswers: Array.isArray(row.acceptedAnswers) ? row.acceptedAnswers : [],
      explanationZhHans: row.explanationZhHans,
      manualReviewReason: unique([
        status !== "pass" ? status : "",
        ...structureFlags,
        ...sourceFlags,
        ...contentFlags,
        ...ragFlags,
        ...duplicateFlags,
        ...mathCheck.notes
      ]).join(" | ")
    };
  });
}

function inventoryIssues(candidates, plan, topics) {
  const issues = [];
  const ids = new Set(candidates.map((row) => row.id));
  const idCounts = countBy(candidates, (row) => row.id);
  const gradeCounts = countBy(candidates, (row) => row.grade);
  const typeCounts = countBy(candidates, (row) => `${row.grade}:${row.type}`);
  const difficultyCounts = countBy(candidates, (row) => `${row.grade}:${row.difficulty}`);
  const topicCounts = countBy(candidates, (row) => row.topicId);

  if (candidates.length !== expectedTotal) issues.push(`total-count:${candidates.length}/${expectedTotal}`);
  for (const grade of grades) {
    const actual = gradeCounts.get(grade) ?? 0;
    if (actual !== expectedGradeCounts[grade]) issues.push(`grade-count:${grade}:${actual}/${expectedGradeCounts[grade]}`);
    for (const [type, expected] of Object.entries(expectedTypeCountsByGrade[grade])) {
      const actualType = typeCounts.get(`${grade}:${type}`) ?? 0;
      if (actualType !== expected) issues.push(`type-count:${grade}:${type}:${actualType}/${expected}`);
    }
    for (const [difficulty, expected] of Object.entries(expectedDifficultyCountsByGrade[grade])) {
      const actualDifficulty = difficultyCounts.get(`${grade}:${difficulty}`) ?? 0;
      if (actualDifficulty !== expected) issues.push(`difficulty-count:${grade}:${difficulty}:${actualDifficulty}/${expected}`);
    }
  }

  for (const topic of topics.filter((topic) => grades.includes(topic.grade))) {
    const expected = expectedTopicCounts[topic.grade];
    const actual = topicCounts.get(topic.id) ?? 0;
    if (actual !== expected) issues.push(`topic-count:${topic.id}:${actual}/${expected}`);
  }

  const duplicateIds = Array.from(idCounts.entries()).filter(([, count]) => count > 1).map(([id]) => id);
  if (duplicateIds.length) issues.push(`duplicate-ids:${duplicateIds.slice(0, 10).join("|")}`);
  const missingPlanIds = plan.filter((row) => !ids.has(row.id)).map((row) => row.id);
  if (missingPlanIds.length) issues.push(`missing-planned-ids:${missingPlanIds.length}`);
  return issues;
}

function releaseDecision(summary) {
  if (summary.totalQuestions !== expectedTotal && summary.blockerRows === 0 && summary.solverGapRows === 0) return "partial-candidate-review-ready";
  if (summary.totalQuestions !== expectedTotal) return "blocked-incomplete-generation";
  if (summary.inventoryIssues.length) return "blocked-inventory";
  if (summary.blockerRows > 0) return "blocked-auto-qa";
  if (summary.solverGapRows > 0) return "blocked-manual-review-required";
  return "approved-for-candidate-review-only";
}

function buildManualQueue(auditRows) {
  return auditRows
    .filter((row) => row.status !== "pass" || ["Challenge", "Exam"].includes(row.difficulty) || row.type === "short-answer")
    .sort((a, b) => {
      const severityRank = { P1: 0, P2: 1, none: 2 };
      return (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9)
        || a.grade.localeCompare(b.grade)
        || a.topicId.localeCompare(b.topicId)
        || a.questionId.localeCompare(b.questionId);
    });
}

function markdownReport(report) {
  const s = report.summary;
  return `# Mainland PEP High DeepSeek V1 Solvability Audit

- Date: ${report.reportDate}
- Input source: ${report.inputSource}
- Release decision: ${s.releaseDecision}
- Total questions: ${s.totalQuestions} / ${expectedTotal}
- Blocker rows: ${s.blockerRows}
- Solver-gap rows: ${s.solverGapRows}
- Pending teacher signoff rows: ${s.pendingTeacherSignoffRows ?? 0}
- Manual review queue rows: ${s.manualReviewQueueRows}

## Counts

- Grade counts: ${JSON.stringify(s.gradeCounts)}
- Type counts: ${JSON.stringify(s.typeCounts)}
- Difficulty counts: ${JSON.stringify(s.difficultyCounts)}
- Status counts: ${JSON.stringify(s.statusCounts)}

## Inventory Issues

${s.inventoryIssues.length ? s.inventoryIssues.map((issue) => `- ${issue}`).join("\n") : "- None."}

## Top Auto-QA Issues

${report.rows.filter((row) => row.severity !== "none").slice(0, 25).map((row) => `- ${row.questionId}: ${row.status}; ${row.manualReviewReason}`).join("\n") || "- None."}

## Manual QA Requirement

- Review at least 10 questions per topic after full generation, plus every row in \`manual-review-queue.csv\`.
- Current run is ${s.totalQuestions === expectedTotal ? "complete" : "partial"}; candidate content remains offline until full generation, S18 review, and owner-approved integration are complete.
`;
}

function releaseMarkdown(report) {
  const s = report.summary;
  return `# QA Release Decision: Mainland PEP High DeepSeek V1

- Decision: ${s.releaseDecision}
- Total questions: ${s.totalQuestions} / ${expectedTotal}
- Inventory issues: ${s.inventoryIssues.length}
- Blocker rows: ${s.blockerRows}
- Solver-gap/manual-review rows: ${s.solverGapRows}
- Pending teacher signoff rows: ${s.pendingTeacherSignoffRows ?? 0}

## Rationale

${s.releaseDecision === "approved-for-candidate-review-only"
  ? "Automated candidate-package gates passed. This is still offline content and requires owner-approved integration work before app use."
  : s.releaseDecision === "partial-candidate-review-ready"
    ? "The remediated partial package has no automated P1 row blockers, but it is incomplete and requires teacher signoff before any candidate approval."
  : "The package is not ready for promotion. Resolve inventory, automated QA, and manual review requirements before any app integration."}

## Next Safe Step

${s.releaseDecision === "partial-candidate-review-ready"
  ? "Complete teacher signoff for the 490 remediated rows, then continue the separate 2100-row generation only after provider transport is stable."
  : s.totalQuestions === expectedTotal
  ? "Fix blocker rows, complete S18 manual review, rerun this audit, then consider a separate app-integration plan."
  : "Resume DeepSeek generation until 210 batch caches / 2100 rows exist, then rerun this audit."}
`;
}

function hongKongDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function main() {
  const moduleCache = new Map();
  const topics = loadTsModule(path.join(rootDir, "data/mainlandPepHighTopics.ts"), moduleCache).mainlandPepHighTopics;
  const ragCards = loadTsModule(path.join(rootDir, "data/rag/mainlandPepHigh.ts"), moduleCache).mainlandPepHighRagCards;
  const patternCards = loadTsModule(path.join(rootDir, "data/rag/mainlandPepHighExamPatterns.ts"), moduleCache).mainlandPepHighExamPatternCards;
  const { source, rows: candidates } = readCandidates();

  const topicById = new Map(topics.map((topic) => [topic.id, topic]));
  const ragCardById = new Map(ragCards.map((card) => [card.id, card]));
  const patternCardById = new Map(patternCards.map((card) => [card.id, card]));
  const topicConcepts = new Map(topics.map((topic) => [topic.id, topicExpectedConcepts(topic, ragCards)]));
  const plan = expectedPlan(topics);
  const context = {
    topicById,
    ragCardById,
    patternCardById,
    topicConcepts,
    existingPrompts: existingHighPromptSet()
  };

  const rows = buildRows(candidates, context);
  const manualReviewQueue = buildManualQueue(rows);
  const invIssues = inventoryIssues(candidates, plan, topics);
  const statusCounts = objectFromCounts(countBy(rows, (row) => row.status));
  const severityCounts = objectFromCounts(countBy(rows, (row) => row.severity));
  const gradeCounts = objectFromCounts(countBy(candidates, (row) => row.grade));
  const typeCounts = objectFromCounts(countBy(candidates, (row) => `${row.grade}-${row.type}`));
  const difficultyCounts = objectFromCounts(countBy(candidates, (row) => `${row.grade}-${row.difficulty}`));
  const blockerRows = rows.filter((row) => row.severity === "P1").length;
  const solverGapRows = rows.filter((row) => row.status === "solver-gap").length;
  const pendingTeacherSignoffRows = rows.filter((row) => row.status === "pending-teacher-signoff").length;

  const summary = {
    totalQuestions: candidates.length,
    expectedQuestions: expectedTotal,
    inputSource: source,
    candidateOnly: true,
    gradeCounts,
    typeCounts,
    difficultyCounts,
    statusCounts,
    severityCounts,
    inventoryIssues: invIssues,
    blockerRows,
    solverGapRows,
    pendingTeacherSignoffRows,
    manualReviewQueueRows: manualReviewQueue.length
  };
  summary.releaseDecision = releaseDecision(summary);

  const report = {
    reportDate: hongKongDate(),
    generatedAt: new Date().toISOString(),
    inputSource: source,
    summary,
    assumptions: [
      "DeepSeek candidates remain offline and are not app-integrated.",
      "DeepSeek is not used as the judge of its own generated answers.",
      "Free-form high-school items without a safe deterministic solver are routed to S18 manual review."
    ],
    rows,
    manualReviewQueue
  };

  fs.writeFileSync(AUDIT_JSON, `${JSON.stringify(report, null, 2)}\n`);
  writeCsv(AUDIT_CSV, rows, [
    "questionId",
    "grade",
    "topicId",
    "type",
    "difficulty",
    "status",
    "severity",
    "structureFlags",
    "sourceFlags",
    "contentFlags",
    "ragFlags",
    "duplicateFlags",
    "mathStatus",
    "mathNotes",
    "evidenceCardIds",
    "examPatternCardIds",
    "manualReviewReason",
    "promptZhHans",
    "answer",
    "acceptedAnswers",
    "explanationZhHans"
  ]);
  writeCsv(MANUAL_QUEUE_CSV, manualReviewQueue, [
    "questionId",
    "grade",
    "topicId",
    "type",
    "difficulty",
    "status",
    "severity",
    "manualReviewReason",
    "promptZhHans",
    "answer",
    "acceptedAnswers",
    "explanationZhHans"
  ]);
  fs.writeFileSync(AUDIT_MD, markdownReport(report));
  fs.writeFileSync(RELEASE_DECISION_MD, releaseMarkdown(report));

  console.log(JSON.stringify({
    totalQuestions: summary.totalQuestions,
    releaseDecision: summary.releaseDecision,
    inventoryIssues: summary.inventoryIssues.length,
    blockerRows: summary.blockerRows,
    solverGapRows: summary.solverGapRows,
    pendingTeacherSignoffRows: summary.pendingTeacherSignoffRows,
    manualReviewQueueRows: summary.manualReviewQueueRows
  }, null, 2));
}

main();
