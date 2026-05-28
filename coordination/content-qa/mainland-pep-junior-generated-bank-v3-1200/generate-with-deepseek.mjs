import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const batchDir = path.join(__dirname, "batches");
const priorBankJsonl = path.join(rootDir, "coordination/content-qa/mainland-pep-junior-generated-bank-v2-1200/questions.jsonl");

const outputFiles = {
  jsonl: path.join(__dirname, "questions.jsonl"),
  csv: path.join(__dirname, "questions.csv"),
  pack: path.join(__dirname, "question-pack.json"),
  coverage: path.join(__dirname, "coverage-matrix.csv"),
  qa: path.join(__dirname, "qa-report.md")
};

const batch = "junior-rag-v3-1200";
const batchSize = 10;
const expectedTotal = 1200;
const questionTypes = ["multiple-choice", "fill-in", "short-answer"];
const typePrefixes = {
  "multiple-choice": "mc",
  "fill-in": "fi",
  "short-answer": "sa"
};
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
const gradeOrder = ["S1", "S2", "S3"];
const forbiddenSourcePattern =
  /原题|原卷|原教材|教材原文|课本原文|答案原句|照抄|改编自|来源于|\bOCR\b|光学字符识别|识别文本|第\s*\d+\s*页|页码|P\.\s*\d+|\.pdf\b|\.docx\b|文件名|路径|source locator|archive path|如图|见图|下图|上图|右图|左图|图中|根据图|观察下面的图/i;
const mathRedFlagPattern = /选项中没有|题目有误|无法确定|不够条件|缺少图|缺少信息|重新计算|重新审查|重新生成|上面算错|答案写错|之前答案|前后[^。；;]*不一致|失误|无法撤回|最终输出|已输出|修正/;

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.trim().replace(/^["']|["']$/g, "");
  }
}

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
    .map((line) => JSON.parse(line));
}

function writeJsonl(filePath, rows) {
  fs.writeFileSync(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
}

function csvEscape(value) {
  const text = (Array.isArray(value) ? value.join(" | ") : String(value ?? "")).replace(/\s*\r?\n\s*/g, " ");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeCsv(filePath, rows, columns) {
  const lines = [columns.join(","), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\-_/，、。,.()[\]（）:：;；]+/g, "");
}

function normalizePrompt(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, "")
    .replace(/[，。！？、；：“”‘’（）()【】\[\]{}]/g, "");
}

function stripOptionLabel(value) {
  return String(value ?? "")
    .trim()
    .replace(/^[A-Da-d][.．、]\s*/, "")
    .trim();
}

function stripDiagramLead(value) {
  return String(value ?? "")
    .trim()
    .replace(/^(如图所示|如图|见图|根据图中条件|观察下图|观察下面的图)[，,：:\s]*/, "")
    .trim();
}

function rowText(question) {
  return [
    question.promptZhHans,
    ...(question.optionsZhHans ?? []),
    question.answer,
    ...(question.acceptedAnswers ?? []),
    question.explanationZhHans
  ].join("\n");
}

function mathRiskText(question) {
  return [question.promptZhHans, question.answer, question.explanationZhHans].join("\n");
}

function unique(values) {
  return Array.from(new Set(values.filter((value) => String(value ?? "").trim().length > 0)));
}

function repeatValue(value, count) {
  return Array.from({ length: count }, () => value);
}

function difficultySequenceForGrade(grade) {
  const quotas = difficultyQuotasByGrade[grade];
  return [
    ...repeatValue("Foundation", quotas.Foundation),
    ...repeatValue("Core", quotas.Core),
    ...repeatValue("Exam", quotas.Exam),
    ...repeatValue("Challenge", quotas.Challenge)
  ];
}

function intersectionScore(queryValues, cardValues) {
  const normalizedCardValues = cardValues.map(normalize);
  return queryValues
    .map(normalize)
    .filter(Boolean)
    .filter((queryValue) =>
      normalizedCardValues.some((cardValue) => cardValue === queryValue || cardValue.includes(queryValue) || queryValue.includes(cardValue))
    ).length;
}

function scorePaperPattern(card, curriculumCard) {
  const values = [
    ...card.unitTitles,
    ...card.conceptIds,
    ...card.competencyTags,
    ...(card.skillTags ?? []),
    ...card.itemTypeTags,
    ...(card.solutionStrategyTags ?? []),
    ...card.misconceptionTags
  ];
  return (
    (card.grade === curriculumCard.grade ? 12 : 0) +
    (card.semester === curriculumCard.semester ? 8 : 0) +
    intersectionScore([...curriculumCard.conceptIds, ...curriculumCard.skillTags, curriculumCard.unitTitle], values) * 5
  );
}

function scoreExamPattern(card, curriculumCard) {
  const values = [
    ...card.unitTitles,
    ...card.conceptIds,
    ...card.competencyTags,
    ...card.itemTypeTags,
    ...card.solutionStrategyTags,
    ...card.misconceptionTags
  ];
  return (
    (card.grades.includes(curriculumCard.grade) ? 12 : 0) +
    (card.semesters.includes(curriculumCard.semester) || card.semesters.includes("full-year") ? 6 : 0) +
    intersectionScore([...curriculumCard.conceptIds, ...curriculumCard.skillTags, curriculumCard.unitTitle], values) * 5
  );
}

function bestEvidenceIds(cards, scoreFn, curriculumCard, occurrence, fallbackFilter) {
  const scored = cards
    .map((card, index) => ({ card, index, score: scoreFn(card, curriculumCard) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index);
  const preferredScored = scored.filter((entry) => fallbackFilter(entry.card));
  const pool = preferredScored.length
    ? preferredScored
    : scored.length
      ? scored
      : cards.filter(fallbackFilter).map((card, index) => ({ card, index, score: 0 }));
  if (!pool.length) throw new Error(`Missing evidence card for ${curriculumCard.id}`);
  return [pool[occurrence % pool.length].card.id];
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

function buildPlan({ curriculumCards, paperPatterns, examPatterns }) {
  const rows = [];
  const topicTypeQuotas = buildTopicTypeQuotas(curriculumCards);
  const difficultySequences = Object.fromEntries(gradeOrder.map((grade) => [grade, difficultySequenceForGrade(grade)]));
  const gradeCounters = Object.fromEntries(gradeOrder.map((grade) => [grade, 0]));

  curriculumCards.forEach((card, cardIndex) => {
    questionTypes.forEach((type) => {
      const quota = topicTypeQuotas.get(topicTypeQuotaKey(card.id, type)) ?? 0;
      for (let localIndex = 0; localIndex < quota; localIndex += 1) {
        const paperPatternCardIds = bestEvidenceIds(
          paperPatterns,
          scorePaperPattern,
          card,
          localIndex,
          (pattern) => pattern.grade === card.grade && pattern.semester === card.semester
        );
        const examPatternCardIds = bestEvidenceIds(
          examPatterns,
          scoreExamPattern,
          card,
          localIndex,
          (pattern) => pattern.grades.includes(card.grade)
        );
        rows.push({
          id: `pep-junior-v3-${card.grade.toLowerCase()}-k${String(cardIndex + 1).padStart(2, "0")}-${typePrefixes[type]}-${String(localIndex + 1).padStart(3, "0")}`,
          batch,
          grade: card.grade,
          semester: card.semester,
          knowledgePointId: card.id,
          unitTitle: card.unitTitle,
          type,
          difficulty: difficultySequences[card.grade][gradeCounters[card.grade]++],
          evidenceCardIds: [card.id],
          paperPatternCardIds,
          examPatternCardIds
        });
      }
    });
  });

  gradeOrder.forEach((grade) => {
    if (gradeCounters[grade] !== 400) throw new Error(`Expected ${grade} to generate 400 targets; found ${gradeCounters[grade]}`);
  });
  if (rows.length !== expectedTotal) throw new Error(`Expected ${expectedTotal} targets; found ${rows.length}`);
  return rows;
}

function chunk(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) chunks.push(values.slice(index, index + size));
  return chunks;
}

function batchIdFor(index) {
  return `batch-${String(index + 1).padStart(3, "0")}`;
}

function compactCurriculumCard(card) {
  return {
    id: card.id,
    grade: card.grade,
    semester: card.semester,
    unitTitle: card.unitTitle,
    conceptIds: card.conceptIds,
    competencyTags: card.competencyTags,
    skillTags: card.skillTags,
    misconceptionTags: card.misconceptionTags,
    safeSummary: card.safeSummary,
    generationGuidance: card.generationGuidance,
    prohibitedReuseNotes: card.prohibitedReuseNotes
  };
}

function compactPaperCard(card) {
  return {
    id: card.id,
    grade: card.grade,
    semester: card.semester,
    unitTitles: card.unitTitles,
    conceptIds: card.conceptIds,
    itemTypeTags: card.itemTypeTags,
    patternSummary: card.patternSummary,
    solutionStrategyTags: card.solutionStrategyTags,
    misconceptionTags: card.misconceptionTags,
    generationGuidance: card.generationGuidance,
    prohibitedReuseNotes: card.prohibitedReuseNotes
  };
}

function compactExamCard(card) {
  return {
    id: card.id,
    grades: card.grades,
    semesters: card.semesters,
    unitTitles: card.unitTitles,
    conceptIds: card.conceptIds,
    itemTypeTags: card.itemTypeTags,
    patternSummary: card.patternSummary,
    solutionStrategyTags: card.solutionStrategyTags,
    misconceptionTags: card.misconceptionTags,
    generationGuidance: card.generationGuidance,
    prohibitedReuseNotes: card.prohibitedReuseNotes
  };
}

function systemPrompt() {
  return [
    "你是 MAIS 的内地人教版初中数学原创题目生成器。",
    "只基于给定 safe-RAG 抽象卡片生成全新 MAIS 原创题，不复制、不改写、不近似套用教材、试卷、v1 或 v2 题目。",
    "输出必须是严格 JSON 对象，形如 {\"questions\":[...]}，不要 Markdown、不要注释、不要额外字段。",
    "每题只输出 id、promptZhHans、optionsZhHans、answer、acceptedAnswers、explanationZhHans；禁止输出 answer_fixed、explanation_fixed、notes 或任何额外字段。",
    "multiple-choice 必须有 4 个唯一选项，answer 必须与且只与一个选项完全一致；fill-in 和 short-answer 的 optionsZhHans 必须是空数组。",
    "解释必须能直接推出答案，并且必须逐字包含 answer 字段中的答案字符串。",
    "不能说题目有误、无法确定、缺图、见图、如图、根据图、图中、观察图、下图、上图、右图、左图。",
    "不能出现自我纠错、前后答案不一致、'写错了'、'但之前答案'、'重新审查'、'我失误了'、'最终输出'、'已输出'、'无法撤回' 等措辞。",
    "题面、数值、语境、答案和解释都要自然、简洁、适合中国内地初中七至九年级。"
  ].join("\n");
}

function userPrompt({ targets, curriculumCards, paperPatterns, examPatterns }) {
  return JSON.stringify({
    task: "Generate fresh Mainland PEP junior math v3 items for the exact target IDs. Do not reuse any v2 item wording or deterministic template content.",
    outputSchema: {
      questions: targets.map((target) => ({
        id: target.id,
        promptZhHans: "string",
        optionsZhHans: target.type === "multiple-choice" ? ["exactly four strings"] : [],
        answer: "string",
        acceptedAnswers: ["answer and safe equivalent forms"],
        explanationZhHans: "string that reaches the answer"
      }))
    },
    targetMetadata: targets,
    safeCurriculumEvidence: curriculumCards.map(compactCurriculumCard),
    safePaperPatternEvidence: paperPatterns.map(compactPaperCard),
    safeExamPatternEvidence: examPatterns.map(compactExamCard),
    constraints: [
      "Use Simplified Chinese.",
      "Use original contexts and numbers.",
      "Each generated item must match its target knowledgePointId and unitTitle. Do not switch to another topic family.",
      "Use only concepts from the target metadata and matching safe evidence; do not introduce unrelated geometry, coordinate, proof, data, or equation topics.",
      "Avoid all diagram-dependent wording, including 如图, 见图, 图中, 根据图, 观察图, 下图, 上图, 右图, 左图.",
      "For data or statistics items, write every number and category in text; do not refer to charts, tables, pictures, or unseen displays.",
      "Every explanationZhHans must include the answer string exactly as written in answer.",
      "Avoid exact v2-style temperature rise/fall, midpoint-only, plain one-step slope, or other obvious deterministic template phrasing when a richer original variant is possible.",
      "Keep Foundation items direct, Core items one or two steps, Exam/Challenge items more diagnostic but still solvable from text only."
    ]
  });
}

function extractJsonObject(text) {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return JSON.parse(trimmed);
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object found in provider reply");
  return JSON.parse(match[0]);
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function postDeepSeek({ apiUrl, apiKey, model, messages, attempt = 0, maxTokens = 6500, timeoutMs = 180000 }) {
  const body = {
    model,
    messages,
    response_format: { type: "json_object" },
    thinking: { type: "disabled" },
    stream: false,
    max_tokens: maxTokens,
    temperature: 0.55
  };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const text = await response.text();
    if (!response.ok) {
      const safeText = text.replaceAll(apiKey, "[REDACTED_API_KEY]").slice(0, 1200);
      if ((response.status === 429 || response.status >= 500) && attempt < 2) {
        await sleep(3000 * (attempt + 1));
        return postDeepSeek({ apiUrl, apiKey, model, messages, attempt: attempt + 1, maxTokens, timeoutMs });
      }
      throw new Error(`DeepSeek request failed with HTTP ${response.status}: ${safeText}`);
    }
    const parsed = JSON.parse(text);
    const content = parsed?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) throw new Error("DeepSeek reply did not include message.content");
    return content;
  } finally {
    clearTimeout(timeout);
  }
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

function normalizeGeneratedQuestion(target, raw, priorIndex) {
  const promptZhHans = typeof raw.promptZhHans === "string" ? stripDiagramLead(raw.promptZhHans) : "";
  let answer = typeof raw.answer === "string" ? raw.answer.trim() : "";
  const explanationZhHans = typeof raw.explanationZhHans === "string" ? raw.explanationZhHans.trim() : "";
  let optionsZhHans = Array.isArray(raw.optionsZhHans) ? raw.optionsZhHans.map((value) => String(value).trim()).filter(Boolean) : [];
  let acceptedAnswers = Array.isArray(raw.acceptedAnswers)
    ? raw.acceptedAnswers.map((value) => String(value).trim()).filter(Boolean)
    : [];
  const errors = [];

  if (target.type === "multiple-choice") {
    const rawAnswer = answer;
    const rawOptions = optionsZhHans;
    const labelMatch = rawAnswer.match(/^[A-Da-d]$/);
    optionsZhHans = rawOptions.map(stripOptionLabel);
    if (labelMatch) {
      const optionIndex = labelMatch[0].toUpperCase().charCodeAt(0) - "A".charCodeAt(0);
      answer = optionsZhHans[optionIndex] ?? rawAnswer;
      acceptedAnswers = unique([answer, rawAnswer, stripOptionLabel(rawOptions[optionIndex]), ...acceptedAnswers.map(stripOptionLabel)]);
    } else {
      answer = stripOptionLabel(answer);
      acceptedAnswers = unique([answer, ...acceptedAnswers.map(stripOptionLabel)]);
    }
  }

  if (raw.id !== target.id) errors.push(`id mismatch: expected ${target.id}, got ${raw.id}`);
  if (!promptZhHans) errors.push("missing promptZhHans");
  if (!answer) errors.push("missing answer");
  if (!explanationZhHans) errors.push("missing explanationZhHans");
  if (target.type === "multiple-choice") {
    if (optionsZhHans.length !== 4) errors.push(`multiple-choice options length ${optionsZhHans.length}`);
    if (new Set(optionsZhHans).size !== optionsZhHans.length) errors.push("multiple-choice options include duplicates");
    if (optionsZhHans.filter((option) => option === answer).length !== 1) errors.push("multiple-choice answer must exactly match one option");
  } else if (optionsZhHans.length) {
    errors.push(`${target.type} must not include options`);
  }

  const question = {
    ...target,
    promptZhHans,
    optionsZhHans: target.type === "multiple-choice" ? optionsZhHans : [],
    answer,
    acceptedAnswers: unique([answer, ...acceptedAnswers]),
    explanationZhHans,
    sourceDistanceStatus: "passed",
    mathQaStatus: "needs-review",
    reviewNotes: "deepseek-original-v3-1200; pending-s18-manual-review"
  };

  const text = rowText(question);
  if (forbiddenSourcePattern.test(text)) errors.push("forbidden source or diagram-dependent wording detected");
  if (mathRedFlagPattern.test(mathRiskText(question))) errors.push("math red-flag wording detected");
  if (!question.acceptedAnswers.length) errors.push("missing acceptedAnswers");
  if (priorIndex.promptKeys.has(normalizePrompt(question.promptZhHans))) errors.push("exact v2 prompt reuse detected");
  if (priorIndex.rowKeys.has(normalizePrompt(text))) errors.push("exact v2 row-content reuse detected");
  return { question, errors };
}

function validateBatch(targets, rawQuestions, priorIndex) {
  if (!Array.isArray(rawQuestions)) throw new Error("Provider JSON missing questions array");
  if (rawQuestions.length !== targets.length) throw new Error(`Expected ${targets.length} questions, got ${rawQuestions.length}`);
  const normalized = [];
  const errors = [];
  for (const target of targets) {
    const raw = rawQuestions.find((question) => question?.id === target.id);
    if (!raw) {
      errors.push(`Missing generated question for ${target.id}`);
      continue;
    }
    const result = normalizeGeneratedQuestion(target, raw, priorIndex);
    normalized.push(result.question);
    errors.push(...result.errors.map((error) => `${target.id}: ${error}`));
  }
  const promptKeys = normalized.map((question) => normalizePrompt(question.promptZhHans));
  const duplicatePromptKeys = promptKeys.filter((key, index) => promptKeys.indexOf(key) !== index);
  if (duplicatePromptKeys.length) errors.push(`duplicate prompts inside batch: ${unique(duplicatePromptKeys).join(",")}`);
  if (errors.length) throw new Error(errors.join("; "));
  return normalized;
}

async function generateBatch({ targets, batchIndex, curriculumCards, paperPatterns, examPatterns, apiUrl, apiKey, model, priorIndex }) {
  const batchId = batchIdFor(batchIndex);
  const cachePath = path.join(batchDir, `${batchId}.json`);
  if (fs.existsSync(cachePath)) {
    const cached = JSON.parse(fs.readFileSync(cachePath, "utf8"));
    try {
      const normalized = validateBatch(targets, cached.questions, priorIndex);
      fs.writeFileSync(cachePath, `${JSON.stringify({ batchId, questions: normalized }, null, 2)}\n`);
      return normalized;
    } catch (error) {
      fs.writeFileSync(
        path.join(batchDir, `${batchId}.invalid.json`),
        `${JSON.stringify({ batchId, cacheValidationError: String(error?.message ?? error), questions: cached.questions }, null, 2)}\n`
      );
      fs.unlinkSync(cachePath);
      console.warn(`${batchId} cache failed validation after rule updates; regenerating batch.`);
    }
  }

  const curriculumIds = unique(targets.flatMap((target) => target.evidenceCardIds));
  const paperPatternIds = unique(targets.flatMap((target) => target.paperPatternCardIds));
  const examPatternIds = unique(targets.flatMap((target) => target.examPatternCardIds));
  const messagesForTargets = (targetSubset) => [
    { role: "system", content: systemPrompt() },
    {
      role: "user",
      content: userPrompt({
        targets: targetSubset,
        curriculumCards: curriculumCards.filter((card) => curriculumIds.includes(card.id)),
        paperPatterns: paperPatterns.filter((card) => paperPatternIds.includes(card.id)),
        examPatterns: examPatterns.filter((card) => examPatternIds.includes(card.id))
      })
    }
  ];
  const baseMessages = messagesForTargets(targets);
  const runSplitGeneration = async (generationMode) => {
    const splitCachePath = path.join(batchDir, `${batchId}.split.json`);
    const combined = fs.existsSync(splitCachePath)
      ? JSON.parse(fs.readFileSync(splitCachePath, "utf8")).questions ?? []
      : [];
    for (const targetSubset of chunk(targets, 1)) {
      if (targetSubset.every((target) => combined.some((question) => question.id === target.id))) continue;
      console.log(`  split ${batchId}: ${targetSubset.map((target) => target.id).join(", ")}`);
      let subsetError = null;
      let subsetMessages = messagesForTargets(targetSubset);
      for (let attempt = 1; attempt <= 4; attempt += 1) {
        let parsed = null;
        try {
          const content = await postDeepSeek({ apiUrl, apiKey, model, messages: subsetMessages, maxTokens: 4000, timeoutMs: 120000 });
          parsed = extractJsonObject(content);
          const normalizedSubset = validateBatch(targetSubset, parsed.questions, priorIndex);
          combined.push(...normalizedSubset);
          fs.writeFileSync(splitCachePath, `${JSON.stringify({ batchId, generationMode: `${generationMode}-partial`, questions: combined }, null, 2)}\n`);
          subsetError = null;
          break;
        } catch (error) {
          subsetError = error;
          const message = String(error?.message ?? error);
          if (parsed?.questions) {
            fs.writeFileSync(
              path.join(batchDir, `${batchId}.${targetSubset[0].id}.invalid.json`),
              `${JSON.stringify({ batchId, targetIds: targetSubset.map((target) => target.id), validationError: message, questions: parsed.questions }, null, 2)}\n`
            );
          }
          if (message.includes("No JSON object") || (parsed && (message.includes("pep-junior-v3") || message.includes("Expected")))) {
            subsetMessages = [
              ...messagesForTargets(targetSubset),
              {
                role: "user",
                content: [
                  "The previous reply failed JSON or validation checks. Regenerate this small target group.",
                  "Return only a JSON object shaped exactly as {\"questions\":[...]} with no prose outside JSON.",
                  "Fix every listed issue. Keep IDs and target metadata unchanged.",
                  "Validation feedback:",
                  message.slice(0, 1800)
                ].join("\n")
              }
            ];
          }
          if (attempt < 4) await sleep(2000 * attempt);
        }
      }
      if (subsetError) throw new Error(`${batchId} split generation failed: ${subsetError?.message ?? subsetError}`);
    }
    const normalized = validateBatch(targets, combined, priorIndex);
    fs.writeFileSync(cachePath, `${JSON.stringify({ batchId, generationMode, questions: normalized }, null, 2)}\n`);
    if (fs.existsSync(splitCachePath)) fs.unlinkSync(splitCachePath);
    return normalized;
  };

  if (process.argv.includes("--split-only")) return runSplitGeneration("deepseek-split-forced");

  let lastError = null;
  let messages = baseMessages;
  let lastParsed = null;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    let parsed = null;
    try {
      const content = await postDeepSeek({ apiUrl, apiKey, model, messages });
      parsed = extractJsonObject(content);
      lastParsed = parsed;
      const normalized = validateBatch(targets, parsed.questions, priorIndex);
      fs.writeFileSync(cachePath, `${JSON.stringify({ batchId, questions: normalized }, null, 2)}\n`);
      return normalized;
    } catch (error) {
      lastError = error;
      if (parsed) {
        fs.writeFileSync(
          path.join(batchDir, `${batchId}.invalid.json`),
          `${JSON.stringify({ batchId, attempt, validationError: String(error?.message ?? error), questions: parsed.questions }, null, 2)}\n`
        );
      }
      const message = String(error?.message ?? error);
      if (message.includes("pep-junior-v3") || message.includes("Expected")) {
        messages = [
          ...baseMessages,
          {
            role: "user",
            content: [
              "The previous JSON failed validation. Regenerate the full batch, not only the failed rows.",
              "Fix every listed issue. Keep all IDs and target metadata unchanged.",
              "Validation feedback:",
              message.slice(0, 2400)
            ].join("\n")
          }
        ];
      }
      if (attempt < 3) await sleep(2000 * attempt);
    }
  }
  if (lastParsed?.questions) {
    const repairMessages = [
      ...baseMessages,
      {
        role: "user",
        content: JSON.stringify({
          task: "Repair the previous batch into a clean final JSON object. Return the full questions array for every target ID, not only failed rows.",
          validationError: String(lastError?.message ?? lastError).slice(0, 3000),
          previousDraftQuestions: lastParsed.questions,
          repairRules: [
            "Keep every target id exactly.",
            "You may change prompt numbers, answers, acceptedAnswers, and explanation to make each item internally consistent.",
            "Do not include self-correction, meta commentary, answer_fixed, explanation_fixed, notes, or any extra fields.",
            "Do not refer to diagrams, charts, tables, unseen displays, or images.",
            "For multiple-choice items, exactly one option must match answer.",
            "For fill-in and short-answer items, optionsZhHans must be an empty array."
          ]
        })
      }
    ];
    for (let repairAttempt = 1; repairAttempt <= 2; repairAttempt += 1) {
      try {
        const content = await postDeepSeek({ apiUrl, apiKey, model, messages: repairMessages });
        const parsed = extractJsonObject(content);
        const normalized = validateBatch(targets, parsed.questions, priorIndex);
        fs.writeFileSync(cachePath, `${JSON.stringify({ batchId, generationMode: "deepseek-repair", questions: normalized }, null, 2)}\n`);
        return normalized;
      } catch (error) {
        lastError = error;
        fs.writeFileSync(
          path.join(batchDir, `${batchId}.invalid.json`),
          `${JSON.stringify({ batchId, repairAttempt, validationError: String(error?.message ?? error), questions: lastParsed.questions }, null, 2)}\n`
        );
        if (repairAttempt < 2) await sleep(2500 * repairAttempt);
      }
    }
  }

  if (String(lastError?.message ?? lastError).includes("terminated")) {
    return runSplitGeneration("deepseek-split");
  }
  throw new Error(`${batchId} failed after retries: ${lastError?.message ?? lastError}`);
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = typeof keyFn === "function" ? keyFn(row) : row[keyFn];
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

function buildCoverageRows(rows, curriculumCards) {
  const topicTypeQuotas = buildTopicTypeQuotas(curriculumCards);
  return curriculumCards.flatMap((card, cardIndex) =>
    questionTypes.map((type) => {
      const count = rows.filter((row) => row.knowledgePointId === card.id && row.type === type).length;
      return {
        knowledgePointOrder: cardIndex + 1,
        knowledgePointId: card.id,
        grade: card.grade,
        semester: card.semester,
        unitTitle: card.unitTitle,
        type,
        expectedCount: topicTypeQuotas.get(topicTypeQuotaKey(card.id, type)) ?? 0,
        actualCount: count
      };
    })
  );
}

function buildQaReport({ questions, plan, model, apiUrl, startedAt, finishedAt, priorIndex }) {
  const endpointHost = new URL(apiUrl).host;
  const duplicateIds = questions.length - new Set(questions.map((question) => question.id)).size;
  const v2PromptReuses = questions.filter((question) => priorIndex.promptKeys.has(normalizePrompt(question.promptZhHans))).length;
  const v2RowReuses = questions.filter((question) => priorIndex.rowKeys.has(normalizePrompt(rowText(question)))).length;
  return [
    "# S18 Mainland PEP Junior V3 DeepSeek Candidate Generation Report",
    "",
    `- Generated at: ${finishedAt}`,
    `- Started at: ${startedAt}`,
    `- Generator: DeepSeek API via local server-side LLM configuration`,
    `- Endpoint host: ${endpointHost}`,
    `- Model: ${model}`,
    `- Batch: ${batch}`,
    `- Target questions: ${plan.length}`,
    `- Generated questions: ${questions.length}`,
    `- Prior v2 bank checked: ${priorIndex.checked ? "yes" : "no"}`,
    `- Prior v2 rows indexed: ${priorIndex.total}`,
    "",
    "## Distribution",
    "",
    `- Grade counts: ${JSON.stringify(countBy(questions, "grade"))}`,
    `- Type counts: ${JSON.stringify(countBy(questions, "type"))}`,
    `- Difficulty counts: ${JSON.stringify(countBy(questions, "difficulty"))}`,
    `- Math QA status counts: ${JSON.stringify(countBy(questions, "mathQaStatus"))}`,
    "",
    "## Non-Reuse Checks",
    "",
    `- Duplicate v3 IDs: ${duplicateIds}`,
    `- Exact v2 prompt reuse rows: ${v2PromptReuses}`,
    `- Exact v2 full row-content reuse rows: ${v2RowReuses}`,
    "",
    "## Release Position",
    "",
    "- This is an offline v3 candidate package only.",
    "- Rows are marked `mathQaStatus: needs-review` and require S18 manual sampling or expanded deterministic QA before app integration.",
    "- No production question-bank source file was edited by this generator.",
    "",
    "## Artifacts",
    "",
    "- `questions.jsonl`",
    "- `questions.csv`",
    "- `question-pack.json`",
    "- `coverage-matrix.csv`",
    "- `batches/*.json` resumable parsed batch cache",
    "- `qa-report.md`",
    "- `generate-with-deepseek.mjs`",
    "- `audit-solvability.mjs`"
  ].join("\n");
}

function printDryPlan(plan) {
  console.log(
    JSON.stringify(
      {
        batch,
        expectedTotal,
        targets: plan.length,
        batches: Math.ceil(plan.length / batchSize),
        gradeCounts: countBy(plan, "grade"),
        typeCounts: countBy(plan, "type"),
        difficultyCounts: countBy(plan, "difficulty")
      },
      null,
      2
    )
  );
}

async function main() {
  const dryPlan = process.argv.includes("--dry-plan");
  const maxBatchesArg = process.argv.find((arg) => arg.startsWith("--max-batches="));
  const maxBatches = maxBatchesArg ? Number(maxBatchesArg.slice("--max-batches=".length)) : Infinity;
  const startBatchArg = process.argv.find((arg) => arg.startsWith("--start-batch="));
  const startBatch = startBatchArg ? Number(startBatchArg.slice("--start-batch=".length)) : 1;
  const skipBeforeStart = process.argv.includes("--skip-before-start");
  loadEnvFile(path.join(rootDir, ".env.local"));
  const apiKey = process.env.LLM_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim();
  const apiUrl = process.env.LLM_API_URL?.trim() || "https://api.deepseek.com/chat/completions";
  const model = process.env.LLM_MODEL?.trim() || "deepseek-v4-pro";
  const curriculumCards = loadTsExport(path.join(rootDir, "data/rag/mainlandPepJunior.ts"), "mainlandPepJuniorRagCards");
  const paperPatterns = loadTsExport(path.join(rootDir, "data/rag/mainlandPepJuniorPaperPatterns.ts"), "mainlandPepJuniorPaperPatternCards");
  const examPatterns = loadTsExport(path.join(rootDir, "data/rag/mainlandJuniorZhongkaoExamPatterns.ts"), "mainlandJuniorZhongkaoExamPatternCards").map(
    (card) => ({ ...card, publisher: "MAINLAND_PEP" })
  );
  const plan = buildPlan({ curriculumCards, paperPatterns, examPatterns });
  const priorIndex = buildPriorContentIndex();
  if (dryPlan) {
    printDryPlan(plan);
    return;
  }

  if (!apiKey) throw new Error("Missing LLM_API_KEY or OPENAI_API_KEY in local environment");
  if (!new URL(apiUrl).host.includes("api.deepseek.com")) throw new Error(`Refusing non-DeepSeek endpoint for this task: ${new URL(apiUrl).host}`);
  if (model !== "deepseek-v4-pro") throw new Error(`Refusing non-DeepSeek V4 Pro model for this task: ${model}`);

  fs.mkdirSync(batchDir, { recursive: true });
  const startedAt = new Date().toISOString();
  const questions = [];
  const batches = chunk(plan, batchSize);
  console.log(`DeepSeek v3 generation starting: ${batches.length} batches, model=${model}, endpoint=${new URL(apiUrl).host}`);
  for (let index = 0; index < batches.length && index < maxBatches; index += 1) {
    const targets = batches[index];
    if (index + 1 < startBatch) {
      if (skipBeforeStart) continue;
      const cachePath = path.join(batchDir, `${batchIdFor(index)}.json`);
      if (!fs.existsSync(cachePath)) throw new Error(`Missing cached batch before --start-batch: ${batchIdFor(index)}`);
      const cached = JSON.parse(fs.readFileSync(cachePath, "utf8"));
      questions.push(...cached.questions);
      continue;
    }
    console.log(`batch ${index + 1}/${batches.length}: ${batchIdFor(index)} ${targets[0].grade} ${targets[0].unitTitle} ${targets[0].type}`);
    const batchQuestions = await generateBatch({
      targets,
      batchIndex: index,
      curriculumCards,
      paperPatterns,
      examPatterns,
      apiUrl,
      apiKey,
      model,
      priorIndex
    });
    questions.push(...batchQuestions);
  }

  if (questions.length !== plan.length) {
    console.log(`Partial run complete: ${questions.length}/${plan.length} generated from current pass. Rerun without --max-batches to continue from cache.`);
  }

  if (questions.length === plan.length) {
    writeJsonl(outputFiles.jsonl, questions);
    fs.writeFileSync(outputFiles.pack, `${JSON.stringify({ questions }, null, 2)}\n`);
    writeCsv(outputFiles.csv, questions, [
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
    ]);
    writeCsv(outputFiles.coverage, buildCoverageRows(questions, curriculumCards), [
      "knowledgePointOrder",
      "knowledgePointId",
      "grade",
      "semester",
      "unitTitle",
      "type",
      "expectedCount",
      "actualCount"
    ]);
    fs.writeFileSync(
      outputFiles.qa,
      `${buildQaReport({ questions, plan, model, apiUrl, startedAt, finishedAt: new Date().toISOString(), priorIndex })}\n`
    );
    console.log("Generation complete: wrote questions.jsonl, questions.csv, question-pack.json, coverage-matrix.csv, qa-report.md");
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
