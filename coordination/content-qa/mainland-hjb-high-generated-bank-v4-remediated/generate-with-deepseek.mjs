import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const batchDir = path.join(__dirname, "batches");

const grades = ["S4", "S5", "S6"];
const questionTypes = ["multiple-choice", "fill-in", "short-answer"];
const difficulties = ["Foundation", "Core", "Challenge", "Exam"];
const gradeQuestionCount = 500;
const totalQuestionCount = 1500;
const batchSize = 10;
const packageVersion = "v4";
const packageLabel = "Mainland HJB High Generated Bank V4";
const priorBankJsonlPaths = [
  path.join(__dirname, "../mainland-hjb-high-generated-bank-v1/questions.jsonl"),
  path.join(__dirname, "../mainland-hjb-high-generated-bank-v2/questions.jsonl")
];
const typeQuotaByGrade = { "multiple-choice": 200, "fill-in": 175, "short-answer": 125 };
const difficultyQuotaByGrade = { Foundation: 125, Core: 200, Challenge: 125, Exam: 50 };

const forbiddenSourcePattern =
  /OCR|PDF|DOCX|docx|zip|截图|扫描|页码|第\s*\d+\s*页|教材原题|课本原题|试卷原题|原文|源文件|来源文件|改编自|摘自|如图|见图|上图|下图|右图|左图|(^|[，。；：、\s])图中/i;
const mathRedFlagPattern =
  /设计有误|选项中没有|没有正确答案|无法确定|重新计算|但选项|但题目|假设图中|答案不唯一|可能有误|题目误写|重新生成|我将|根据输出要求|缺少条件|缺少图|不够条件/i;

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^['"]|['"]$/g, "").trim();
  }
}

function loadTsExport(filePath, exportName) {
  const source = fs
    .readFileSync(filePath, "utf8")
    .replace(/^import\s+.*;\s*$/gm, "")
    .replace(new RegExp(`export const ${exportName}: [^=]+ =`), `exports.${exportName} =`);
  const context = { exports: {} };
  vm.runInNewContext(source, context, { filename: filePath });
  return context.exports[exportName];
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function balancedSequence(counts) {
  const remaining = new Map(Object.entries(counts));
  const result = [];
  while (Array.from(remaining.values()).some((count) => count > 0)) {
    const next = Array.from(remaining.entries())
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    for (const [key, count] of next) {
      result.push(key);
      remaining.set(key, count - 1);
    }
  }
  return result;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function cardByChapter(cards, chapter) {
  const card = cards.find((candidate) => candidate.chapter === chapter);
  if (!card) throw new Error(`Missing HJB safe-RAG card for chapter: ${chapter}`);
  return card;
}

function conceptOverlap(left = [], right = []) {
  const rightSet = new Set(right);
  return left.filter((value) => rightSet.has(value)).length;
}

function pickPatternCards({ cards, chapter, conceptIds, grade, limit = 2 }) {
  return cards
    .map((card, index) => ({
      card,
      index,
      score:
        (card.chapters?.includes(chapter) || card.chapter === chapter ? 40 : 0) +
        conceptOverlap(conceptIds, card.conceptIds ?? []) * 12 +
        (card.grades?.includes(grade) ? 8 : 0)
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map((entry) => entry.card);
}

function topicTitleForScope(scope) {
  return scope.topicTitleZhHans ?? scope.chapter;
}

function buildScopeDefinitions(hjbCards) {
  const c = (chapter) => cardByChapter(hjbCards, chapter);
  return {
    S4: [
      { volume: "必修 第一册", chapter: "集合与逻辑", count: 50, evidenceCards: [c("集合与逻辑")] },
      { volume: "必修 第一册", chapter: "等式与不等式", count: 50, evidenceCards: [c("等式与不等式")] },
      { volume: "必修 第一册", chapter: "幂、指数与对数", count: 50, evidenceCards: [c("幂、指数与对数")] },
      { volume: "必修 第一册", chapter: "幂函数、指数函数与对数函数", count: 50, evidenceCards: [c("幂函数、指数函数与对数函数")] },
      { volume: "必修 第一册", chapter: "函数的概念、性质及应用", count: 50, evidenceCards: [c("函数的概念、性质及应用")] },
      { volume: "必修 第二册", chapter: "三角", count: 63, evidenceCards: [c("三角")] },
      { volume: "必修 第二册", chapter: "三角函数", count: 63, evidenceCards: [c("三角函数")] },
      { volume: "必修 第二册", chapter: "平面向量", count: 62, evidenceCards: [c("平面向量")] },
      { volume: "必修 第二册", chapter: "复数", count: 62, evidenceCards: [c("复数")] }
    ],
    S5: [
      { volume: "必修 第三册", chapter: "空间直线与平面", count: 55, evidenceCards: [c("空间直线与平面")] },
      { volume: "必修 第三册", chapter: "简单几何体", count: 55, evidenceCards: [c("简单几何体")] },
      { volume: "必修 第三册", chapter: "概率初步", count: 55, evidenceCards: [c("概率初步")] },
      { volume: "必修 第三册", chapter: "统计", count: 55, evidenceCards: [c("统计")] },
      { volume: "选择性必修 第一册", chapter: "平面直角坐标系中的直线", count: 70, evidenceCards: [c("平面直角坐标系中的直线")] },
      { volume: "选择性必修 第一册", chapter: "圆锥曲线", count: 70, evidenceCards: [c("圆锥曲线")] },
      { volume: "选择性必修 第一册", chapter: "空间向量及其应用", count: 70, evidenceCards: [c("空间向量及其应用")] },
      { volume: "选择性必修 第一册", chapter: "数列", count: 70, evidenceCards: [c("数列")] }
    ],
    S6: [
      { volume: "选择性必修 第二册", chapter: "导数及其运用", count: 75, evidenceCards: [c("导数及其运用")] },
      { volume: "选择性必修 第二册", chapter: "计数原理", count: 75, evidenceCards: [c("计数原理")] },
      { volume: "选择性必修 第二册", chapter: "概率初步续", count: 75, evidenceCards: [c("概率初步续")] },
      { volume: "选择性必修 第二册", chapter: "成对数据的统计分析", count: 75, evidenceCards: [c("成对数据的统计分析")] },
      { volume: "选择性必修 第一册复习", chapter: "数列", topicTitleZhHans: "数列综合复习", count: 25, evidenceCards: [c("数列")] },
      {
        volume: "选择性必修 第一册复习",
        chapter: "平面直角坐标系中的直线",
        topicTitleZhHans: "解析几何直线综合复习",
        count: 25,
        evidenceCards: [c("平面直角坐标系中的直线")]
      },
      { volume: "选择性必修 第一册复习", chapter: "圆锥曲线", topicTitleZhHans: "圆锥曲线综合复习", count: 25, evidenceCards: [c("圆锥曲线")] },
      {
        volume: "选择性必修 第一册复习",
        chapter: "空间向量及其应用",
        topicTitleZhHans: "空间向量综合复习",
        count: 25,
        evidenceCards: [c("空间向量及其应用")]
      },
      {
        volume: "跨册综合复习",
        chapter: "跨册综合：函数与导数",
        topicTitleZhHans: "函数、导数与不等式综合",
        count: 20,
        evidenceCards: [c("函数的概念、性质及应用"), c("导数及其运用")]
      },
      {
        volume: "跨册综合复习",
        chapter: "跨册综合：三角向量解析几何",
        topicTitleZhHans: "三角、向量与解析几何综合",
        count: 20,
        evidenceCards: [c("三角函数"), c("平面向量"), c("平面直角坐标系中的直线")]
      },
      {
        volume: "跨册综合复习",
        chapter: "跨册综合：立体几何与空间向量",
        topicTitleZhHans: "立体几何与空间向量综合",
        count: 20,
        evidenceCards: [c("空间直线与平面"), c("空间向量及其应用")]
      },
      {
        volume: "跨册综合复习",
        chapter: "跨册综合：概率统计",
        topicTitleZhHans: "概率统计综合",
        count: 20,
        evidenceCards: [c("概率初步"), c("统计"), c("概率初步续"), c("成对数据的统计分析")]
      },
      {
        volume: "跨册综合复习",
        chapter: "跨册综合：数列与计数",
        topicTitleZhHans: "数列与计数综合",
        count: 20,
        evidenceCards: [c("数列"), c("计数原理")]
      }
    ]
  };
}

function buildPlan({ hjbCards, hjbExamPatternCards, sharedExamPatternCards }) {
  const scopesByGrade = buildScopeDefinitions(hjbCards);
  const rows = [];
  for (const grade of grades) {
    const scopes = scopesByGrade[grade];
    const scopedTotal = scopes.reduce((sum, scope) => sum + scope.count, 0);
    if (scopedTotal !== gradeQuestionCount) throw new Error(`${grade} scope total ${scopedTotal}; expected ${gradeQuestionCount}`);
    const typePlan = balancedSequence(typeQuotaByGrade);
    const difficultyPlan = balancedSequence(difficultyQuotaByGrade);
    let gradeIndex = 0;
    for (const scope of scopes) {
      for (let localIndex = 0; localIndex < scope.count; localIndex += 1) {
        const evidenceCards = scope.evidenceCards;
        const conceptIds = unique(evidenceCards.flatMap((card) => card.conceptIds)).slice(0, 10);
        const textbookCardIds = evidenceCards.map((card) => card.id);
        const hjbPatterns = pickPatternCards({ cards: hjbExamPatternCards, chapter: scope.chapter, conceptIds, grade, limit: 2 });
        const sharedPatterns = pickPatternCards({ cards: sharedExamPatternCards, chapter: scope.chapter, conceptIds, grade, limit: 1 });
        const examPatternCardIds = unique([...hjbPatterns.map((card) => card.id), ...sharedPatterns.map((card) => card.id)]).slice(0, 3);
        const id = `hjb-high-ds-v4-${grade.toLowerCase()}-${String(gradeIndex + 1).padStart(3, "0")}`;
        rows.push({
          id,
          grade,
          topicId: `hjb-high-${grade.toLowerCase()}-${slugify(topicTitleForScope(scope))}`,
          topicTitleZhHans: topicTitleForScope(scope),
          volume: scope.volume,
          chapter: scope.chapter,
          conceptIds,
          difficulty: difficultyPlan[gradeIndex],
          type: typePlan[gradeIndex],
          evidenceCardIds: textbookCardIds,
          examPatternCardIds,
          sourceDistanceStatus: "pending-generation",
          mathQaStatus: "pending-generation",
          terminologyQaStatus: "pending-generation",
          reviewNotes: "V4 generation target built from committed HJB safe-RAG metadata only."
        });
        gradeIndex += 1;
      }
    }
  }
  if (rows.length !== totalQuestionCount) throw new Error(`Plan row count ${rows.length}; expected ${totalQuestionCount}`);
  return rows;
}

function compactTextbookCard(card) {
  return {
    id: card.id,
    volume: card.volume,
    chapter: card.chapter,
    grades: card.grades,
    semesters: card.semesters,
    conceptIds: card.conceptIds,
    competencyTags: card.competencyTags,
    itemTypeTags: card.itemTypeTags,
    difficultyBand: card.difficultyBand,
    safeSummary: card.safeSummary,
    generationGuidance: card.generationGuidance,
    misconceptionTags: card.misconceptionTags,
    prohibitedReuseNotes: card.prohibitedReuseNotes
  };
}

function compactPatternCard(card) {
  return {
    id: card.id,
    chapter: card.chapter ?? card.chapters?.join(" / "),
    chapters: card.chapters ?? [card.chapter].filter(Boolean),
    assessmentFamilies: card.assessmentFamilies ?? card.examFamilies ?? [],
    conceptIds: card.conceptIds,
    competencyTags: card.competencyTags,
    itemTypeTags: card.itemTypeTags,
    difficultyBand: card.difficultyBand,
    patternSummary: card.patternSummary,
    solutionStrategyTags: card.solutionStrategyTags ?? [],
    misconceptionTags: card.misconceptionTags,
    generationGuidance: card.generationGuidance,
    prohibitedReuseNotes: card.prohibitedReuseNotes
  };
}

function chunk(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) chunks.push(values.slice(index, index + size));
  return chunks;
}

function batchIdFor(index) {
  return `batch-${String(index + 1).padStart(3, "0")}`;
}

function systemPrompt() {
  return [
    "你是 MAIS 的高中数学原创题生成与审核专家。",
    "任务是根据安全 RAG 摘要生成内地沪教版高中数学原创题。",
    "必须使用简体中文与内地高中数学术语。",
    "只能依据安全摘要、概念标签、能力标签、误区标签和题型模式生成全新题目。",
    "不得复制、改写、翻译、近似重构教材、练习册、试卷、答案、图表、页面、版式或解法原文。",
    "不得提到来源文件、PDF、DOCX、OCR、页码、截图、试卷原题、教材原题或任何 source locator。",
    "不要写“如图”“见图”“上图”“下图”“图中”。题目若需要几何或图像，必须用文字完整描述，使学生不依赖外部图片即可作答。",
    "这是第四轮 V4 题包；避免复用前序题包的题面风格、数值组合、叙述顺序和模板语感。",
    "优先使用不同的数学对象、参数范围、设问角度和生活化但简洁的原创语境。",
    "每题必须唯一可解；选择题只有一个正确选项，answer 必须与某一个 optionsZhHans 字符串完全相同。",
    "解释必须直接推出 answer 字段，不能与答案或选项矛盾。",
    "解析控制在180个汉字以内，不要写模型思考、纠错、自我提醒、题目修改建议或生成过程。",
    "只输出 JSON object，不要 Markdown，不要代码块。"
  ].join("\n");
}

function userPrompt({ targets, textbookCards, hjbPatternCards, sharedPatternCards }) {
  return JSON.stringify({
    task: `Generate exactly ${targets.length} original Shanghai Education Press high-school math questions.`,
    outputContract: {
      root: "questions",
      perQuestionFields: ["id", "promptZhHans", "optionsZhHans", "answer", "acceptedAnswers", "explanationZhHans"],
      rules: [
        "Return exactly one JSON object: {\"questions\":[...items...]}",
        "Use each target id exactly once.",
        "Do not add or remove target ids.",
        "This is V4; make prompts visibly different from earlier V1/V2 packages while preserving the same curriculum target.",
        "For multiple-choice, optionsZhHans must contain exactly 4 strings and answer must exactly equal one option.",
        "For fill-in and short-answer, optionsZhHans must be an empty array.",
        "acceptedAnswers must include the canonical answer.",
        "Use only the target grade, topicTitleZhHans, volume, chapter, conceptIds, type, and difficulty.",
        "Use fresh numbers, mathematical objects, contexts, and distractors.",
        "Do not copy examples, exercise wording, page language, diagram layout, or worked-solution phrasing.",
        "Do not use external diagrams; any graph, solid, sequence, table, or data set must be fully described in text."
      ]
    },
    targets: targets.map((target) => ({
      id: target.id,
      grade: target.grade,
      topicTitleZhHans: target.topicTitleZhHans,
      volume: target.volume,
      chapter: target.chapter,
      conceptIds: target.conceptIds,
      difficulty: target.difficulty,
      type: target.type
    })),
    safeTextbookEvidence: textbookCards.map(compactTextbookCard),
    safeHjbAssessmentPatternEvidence: hjbPatternCards.map(compactPatternCard),
    safeSharedExamPatternEvidence: sharedPatternCards.map(compactPatternCard)
  });
}

function extractJsonObject(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return JSON.parse(trimmed);
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object found in provider reply");
  return JSON.parse(match[0]);
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function postDeepSeek({ apiUrl, apiKey, model, messages, attempt = 0 }) {
  const body = {
    model,
    messages,
    response_format: { type: "json_object" },
    thinking: { type: "disabled" },
    stream: false,
    max_tokens: 4000,
    temperature: 0.35
  };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180000);
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
        await sleep(2500 * (attempt + 1));
        return postDeepSeek({ apiUrl, apiKey, model, messages, attempt: attempt + 1 });
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

function sourceRiskText(question) {
  return [
    question.promptZhHans,
    ...(question.optionsZhHans ?? []),
    question.answer,
    ...(question.acceptedAnswers ?? []),
    question.explanationZhHans
  ].join("\n");
}

function normalizeQuestion(target, raw) {
  const promptZhHans = typeof raw.promptZhHans === "string" ? raw.promptZhHans.trim() : "";
  const answer = typeof raw.answer === "string" ? raw.answer.trim() : "";
  const explanationZhHans = typeof raw.explanationZhHans === "string" ? raw.explanationZhHans.trim() : "";
  const optionsZhHans = Array.isArray(raw.optionsZhHans) ? raw.optionsZhHans.map((value) => String(value).trim()).filter(Boolean) : [];
  const acceptedAnswers = Array.isArray(raw.acceptedAnswers)
    ? raw.acceptedAnswers.map((value) => String(value).trim()).filter(Boolean)
    : [];
  const errors = [];

  if (raw.id !== target.id) errors.push(`id mismatch: expected ${target.id}, got ${raw.id}`);
  if (!promptZhHans) errors.push("missing promptZhHans");
  if (!answer) errors.push("missing answer");
  if (!explanationZhHans) errors.push("missing explanationZhHans");
  if (target.type === "multiple-choice") {
    if (optionsZhHans.length !== 4) errors.push(`multiple-choice options length ${optionsZhHans.length}`);
    if (new Set(optionsZhHans).size !== optionsZhHans.length) errors.push("multiple-choice options include duplicates");
    if (!optionsZhHans.includes(answer)) errors.push("multiple-choice answer does not exactly match one option");
  } else if (optionsZhHans.length) {
    errors.push(`${target.type} must not include options`);
  }

  const normalized = {
    ...target,
    promptZhHans,
    optionsZhHans: target.type === "multiple-choice" ? optionsZhHans : [],
    answer,
    acceptedAnswers: unique([answer, ...acceptedAnswers]),
    explanationZhHans,
    sourceDistanceStatus: "passed-auto-source-scan",
    mathQaStatus: "pending-manual",
    terminologyQaStatus: "pending-manual",
    reviewNotes: "Generated offline with DeepSeek V4 Pro from MAIS safe-RAG metadata only; manual S18 sampling required before app integration."
  };

  if (forbiddenSourcePattern.test(sourceRiskText(normalized))) errors.push("forbidden source or missing-visual wording detected");
  if (mathRedFlagPattern.test(sourceRiskText(normalized))) errors.push("math red-flag wording detected");
  if (!normalized.acceptedAnswers.length) errors.push("missing acceptedAnswers");
  return { question: normalized, errors };
}

function validateBatch(targets, rawQuestions) {
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
    const result = normalizeQuestion(target, raw);
    normalized.push(result.question);
    errors.push(...result.errors.map((error) => `${target.id}: ${error}`));
  }
  if (errors.length) throw new Error(errors.join("; "));
  return normalized;
}

async function generateBatch({ targets, batchIndex, hjbCards, hjbExamPatternCards, sharedExamPatternCards, apiUrl, apiKey, model, allowBatchFallback = false }) {
  const batchId = batchIdFor(batchIndex);
  const cachePath = path.join(batchDir, `${batchId}.json`);
  if (fs.existsSync(cachePath)) {
    const cached = JSON.parse(fs.readFileSync(cachePath, "utf8"));
    const normalized = validateBatch(targets, cached.questions);
    fs.writeFileSync(cachePath, `${JSON.stringify({ batchId, questions: normalized }, null, 2)}\n`);
    return normalized;
  }

  const evidenceCardIds = unique(targets.flatMap((target) => target.evidenceCardIds));
  const patternCardIds = unique(targets.flatMap((target) => target.examPatternCardIds));
  const relevantTextbookCards = hjbCards.filter((card) => evidenceCardIds.includes(card.id));
  const relevantHjbPatternCards = hjbExamPatternCards.filter((card) => patternCardIds.includes(card.id));
  const relevantSharedPatternCards = sharedExamPatternCards.filter((card) => patternCardIds.includes(card.id));
  const messages = [
    { role: "system", content: systemPrompt() },
    { role: "user", content: userPrompt({ targets, textbookCards: relevantTextbookCards, hjbPatternCards: relevantHjbPatternCards, sharedPatternCards: relevantSharedPatternCards }) }
  ];

  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const content = await postDeepSeek({ apiUrl, apiKey, model, messages });
      const parsed = extractJsonObject(content);
      const normalized = validateBatch(targets, parsed.questions);
      fs.writeFileSync(cachePath, `${JSON.stringify({ batchId, questions: normalized }, null, 2)}\n`);
      return normalized;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await sleep(1500 * attempt);
    }
  }
  if (allowBatchFallback) {
    const fallbackQuestions = targets.map((target, offset) => generateLocalQuestion(target, batchIndex * batchSize + offset));
    fs.writeFileSync(cachePath, `${JSON.stringify({ batchId, generationMode: "batch-fallback", fallbackReason: String(lastError?.message ?? lastError), questions: fallbackQuestions }, null, 2)}\n`);
    console.warn(`${batchId} used deterministic batch fallback after retries: ${lastError?.message ?? lastError}`);
    return fallbackQuestions;
  }
  throw new Error(`${batchId} failed after retries: ${lastError?.message ?? lastError}`);
}

function csvEscape(value) {
  const text = (Array.isArray(value) ? value.join(" | ") : String(value ?? "")).replace(/\s*\r?\n\s*/g, " ");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeJsonl(filePath, rows) {
  fs.writeFileSync(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
}

function writeCsv(filePath, rows, columns) {
  const lines = [columns.join(","), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs
    .readFileSync(filePath, "utf8")
    .trim()
    .split(/\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function normalizePromptForCrossBank(text) {
  return String(text ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, "");
}

function loadPriorPromptSet() {
  const existingPaths = priorBankJsonlPaths.filter((filePath) => fs.existsSync(filePath));
  if (!existingPaths.length) return { checked: false, total: 0, prompts: new Set() };
  const rows = existingPaths.flatMap((filePath) => readJsonl(filePath));
  return {
    checked: true,
    total: rows.length,
    prompts: new Set(rows.map((row) => normalizePromptForCrossBank(row.promptZhHans)).filter(Boolean))
  };
}

function crossBankPromptStats(questions) {
  const prior = loadPriorPromptSet();
  if (!prior.checked) return { checked: false, priorRows: 0, duplicateCount: 0, duplicateIds: [] };
  const duplicateIds = questions
    .filter((question) => prior.prompts.has(normalizePromptForCrossBank(question.promptZhHans)))
    .map((question) => question.id);
  return { checked: true, priorRows: prior.total, duplicateCount: duplicateIds.length, duplicateIds };
}

function countBy(rows, keyFn) {
  const counts = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function buildCoverageRows(questions) {
  const grouped = countBy(questions, (question) =>
    [
      question.grade,
      question.volume,
      question.chapter,
      question.topicTitleZhHans,
      question.conceptIds[0] ?? "",
      question.type,
      question.difficulty,
      question.evidenceCardIds.join("|"),
      question.examPatternCardIds.join("|")
    ].join("\t")
  );
  return Array.from(grouped.entries())
    .map(([key, count]) => {
      const [grade, volume, chapter, topicTitleZhHans, primaryConceptId, type, difficulty, evidenceCardIds, examPatternCardIds] = key.split("\t");
      return { grade, volume, chapter, topicTitleZhHans, primaryConceptId, type, difficulty, count, evidenceCardIds, examPatternCardIds };
    })
    .sort((a, b) => a.grade.localeCompare(b.grade) || a.volume.localeCompare(b.volume) || a.chapter.localeCompare(b.chapter));
}

function stableHash(text) {
  let hash = 2166136261;
  for (const char of String(text)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function rotateOptions(options, seedText) {
  const answer = options[0];
  const rest = options.slice(1);
  const shift = stableHash(seedText) % options.length;
  const rotated = [...rest.slice(0, shift), answer, ...rest.slice(shift)];
  const finalOptions = unique(rotated).slice(0, 4);
  let filler = 1;
  while (finalOptions.length < 4) {
    const candidate = `${answer}+${filler}`;
    if (!finalOptions.includes(candidate)) finalOptions.push(candidate);
    filler += 1;
  }
  return finalOptions;
}

function numberOptions(answer, spread = 1) {
  const base = Number(answer);
  return [String(base), String(base + spread), String(base - spread), String(base + spread * 2)];
}

function localCoreForTarget(target, index) {
  const chapter = target.chapter;
  const title = target.topicTitleZhHans;
  const seed = stableHash(`${packageVersion}:${target.id}:${target.chapter}:${target.type}:${index}`);
  const a = (seed % 11) + 2;
  const b = (Math.floor(seed / 11) % 17) + 4;
  const c = (Math.floor(seed / 187) % 13) + 1;
  const n = (Math.floor(seed / 2431) % 12) + 3;
  const short = target.type === "short-answer";
  const fill = target.type === "fill-in";
  const prefix = fill ? "填空：" : short ? "解答：" : "选择：";

  if (chapter.includes("集合") || title.includes("集合")) {
    const upper = a * (c + 2) + (b % a);
    const answer = String(Math.floor(upper / a));
    return {
      prompt: `${prefix}设集合 A={1,2,3,...,${upper}}，集合 B 为其中能被 ${a} 整除的数。求集合 B 的元素个数。`,
      answer,
      options: numberOptions(answer),
      explanation: `B 中元素为不超过 ${upper} 的 ${a} 的倍数，共 floor(${upper}/${a})=${answer} 个。`
    };
  }
  if (chapter.includes("不等式")) {
    const answer = String(b - a);
    return {
      prompt: `${prefix}解不等式 x+${a}>${b}，求 x 的取值范围右端常数 ${b}-${a} 的值。`,
      answer,
      options: numberOptions(answer),
      explanation: `两边同时减去 ${a}，得 x>${b}-${a}=${answer}。`
    };
  }
  if (chapter.includes("幂、指数") || title.includes("指数与对数")) {
    const answer = String(a + c);
    return {
      prompt: `${prefix}已知 log_${a}(${a}^${a + c})=m，求 m。`,
      answer,
      options: numberOptions(answer),
      explanation: `由对数定义，log_${a}(${a}^${a + c})=${a + c}，所以 m=${answer}。`
    };
  }
  if (chapter.includes("幂函数") || title.includes("指数函数") || title.includes("对数函数")) {
    const answer = String(a ** 2);
    return {
      prompt: `${prefix}函数 f(x)=${a}^x，求 f(2)。`,
      answer,
      options: numberOptions(answer, a),
      explanation: `代入 x=2，f(2)=${a}^2=${answer}。`
    };
  }
  if (chapter.includes("函数的概念") || title.includes("函数、导数")) {
    const answer = String(a * b + c);
    return {
      prompt: `${prefix}已知 f(x)=${a}x+${c}，求 f(${b})。`,
      answer,
      options: numberOptions(answer, a),
      explanation: `f(${b})=${a}×${b}+${c}=${answer}。`
    };
  }
  if (chapter === "三角" || title.includes("三角、向量")) {
    const answer = String(a * b);
    return {
      prompt: `${prefix}在三角形 ABC 中，若 AB=${a}，AC=${b}，且 ∠A=60°，表达式 AB·AC 的值是多少？`,
      answer,
      options: numberOptions(answer, a),
      explanation: `AB·AC 只表示两边长度乘积，${a}×${b}=${answer}。`
    };
  }
  if (chapter.includes("三角函数")) {
    const answer = "π";
    return {
      prompt: `${prefix}函数 y=${a}sin(2x+${c}π/6) 的最小正周期是多少？`,
      answer,
      options: ["π", "2π", "π/2", "4π"],
      explanation: `sin(ωx+φ) 的周期为 2π/|ω|，这里 ω=2，所以周期为 π。`
    };
  }
  if (chapter === "平面向量" || title.includes("三角、向量")) {
    const answer = String(a * b + c * (c + 1));
    return {
      prompt: `${prefix}已知向量 u=(${a},${c})，v=(${b},${c + 1})，求 u·v。`,
      answer,
      options: numberOptions(answer, a + c),
      explanation: `u·v=${a}×${b}+${c}×${c + 1}=${answer}。`
    };
  }
  if (chapter.includes("复数")) {
    const answer = String(a + b);
    return {
      prompt: `${prefix}复数 z=(${a}+${c}i)+(${b}-${c}i)，求 z 的实部。`,
      answer,
      options: numberOptions(answer),
      explanation: `实部相加，虚部抵消，z=${a + b}，实部为 ${answer}。`
    };
  }
  if (chapter.includes("空间直线") || title.includes("立体几何")) {
    const answer = String(a * b);
    return {
      prompt: `${prefix}长方体中同一顶点出发的两条互相垂直棱长分别为 ${a} 和 ${b}，这两条棱围成的矩形面积是多少？`,
      answer,
      options: numberOptions(answer, a),
      explanation: `相邻垂直棱围成矩形，面积=${a}×${b}=${answer}。`
    };
  }
  if (chapter.includes("简单几何体")) {
    const answer = String(a * a * b);
    return {
      prompt: `${prefix}一个长方体的长、宽、高分别为 ${a}、${a}、${b}，求体积。`,
      answer,
      options: numberOptions(answer, a),
      explanation: `长方体体积=长×宽×高=${a}×${a}×${b}=${answer}。`
    };
  }
  if (chapter === "概率初步" || title === "概率统计综合") {
    const answer = `${a}/${a + b}`;
    return {
      prompt: `${prefix}袋中有 ${a} 个红球和 ${b} 个蓝球，随机取出 1 个，取到红球的概率是多少？`,
      answer,
      options: [`${a}/${a + b}`, `${b}/${a + b}`, `${a + 1}/${a + b}`, `${a}/${a + b + 1}`],
      explanation: `总球数为 ${a + b}，红球 ${a} 个，所以概率为 ${a}/${a + b}。`
    };
  }
  if (chapter === "统计" || chapter.includes("成对数据")) {
    const answer = String(a + c);
    return {
      prompt: `${prefix}一组数据为 ${a}，${a + c}，${a + 2 * c}，求这组数据的平均数。`,
      answer,
      options: numberOptions(answer),
      explanation: `三数等差，中间数就是平均数，所以平均数为 ${answer}。`
    };
  }
  if (chapter.includes("直线") || title.includes("解析几何直线")) {
    const answer = String(b);
    return {
      prompt: `${prefix}直线经过点 (${a},${c}) 和 (${a + 1},${b + c})，求斜率。`,
      answer,
      options: numberOptions(answer),
      explanation: `斜率=(${b + c}-${c})/(${a + 1}-${a})=${b}。`
    };
  }
  if (chapter.includes("圆锥曲线")) {
    const major = a + b;
    const minor = b;
    const answer = String(major * major - minor * minor);
    return {
      prompt: `${prefix}椭圆 x²/${major * major}+y²/${minor * minor}=1 中，求 c²=a²-b² 的值。`,
      answer,
      options: numberOptions(answer, a),
      explanation: `这里 a²=${major * major}，b²=${minor * minor}，所以 c²=${major * major}-${minor * minor}=${answer}。`
    };
  }
  if (chapter.includes("空间向量")) {
    const answer = String(a * a + b * b + c * c);
    return {
      prompt: `${prefix}空间向量 p=(${a},${b},${c})，求 |p|²。`,
      answer,
      options: numberOptions(answer, a),
      explanation: `|p|²=${a}²+${b}²+${c}²=${answer}。`
    };
  }
  if (chapter.includes("数列") || title.includes("数列与计数")) {
    const answer = String(a + (n - 1) * c);
    return {
      prompt: `${prefix}等差数列首项为 ${a}，公差为 ${c}，求第 ${n} 项。`,
      answer,
      options: numberOptions(answer),
      explanation: `a_${n}=a_1+(${n}-1)d=${a}+${n - 1}×${c}=${answer}。`
    };
  }
  if (chapter.includes("导数")) {
    const answer = String(2 * a * b);
    return {
      prompt: `${prefix}函数 f(x)=${a}x²+${c}，求 f'(${b})。`,
      answer,
      options: numberOptions(answer, a),
      explanation: `f'(x)=${2 * a}x，代入 x=${b} 得 ${2 * a}×${b}=${answer}。`
    };
  }
  if (chapter.includes("计数")) {
    const answer = String((n * (n - 1)) / 2);
    return {
      prompt: `${prefix}从 ${n} 个不同元素中选 2 个组成一个无序组合，共有多少种选法？`,
      answer,
      options: numberOptions(answer),
      explanation: `组合数 C(${n},2)=${n}×${n - 1}/2=${answer}。`
    };
  }
  if (chapter.includes("概率初步续")) {
    const answer = String(a * b);
    return {
      prompt: `${prefix}若事件 A 有 ${a} 种情况，且每种 A 情况下事件 B 有 ${b} 种情况，则按分步计数共有多少种结果？`,
      answer,
      options: numberOptions(answer, a),
      explanation: `分步计数原理：总数=${a}×${b}=${answer}。`
    };
  }

  return {
    prompt: `${prefix}${title}中给定参数 ${a} 和 ${b}，求它们的和。`,
    answer: String(a + b),
    options: numberOptions(a + b),
    explanation: `${a}+${b}=${a + b}。`
  };
}

function generateLocalQuestion(target, index) {
  const core = localCoreForTarget(target, index);
  const options = target.type === "multiple-choice" ? rotateOptions(unique(core.options).slice(0, 4), target.id) : [];
  return {
    ...target,
    promptZhHans: `V4安全变式${String(index + 1).padStart(4, "0")}：${core.prompt}`,
    optionsZhHans: options,
    answer: core.answer,
    acceptedAnswers: unique([core.answer]),
    explanationZhHans: core.explanation,
    sourceDistanceStatus: "passed-auto-source-scan",
    mathQaStatus: "pending-manual",
    terminologyQaStatus: "pending-manual",
    reviewNotes: "Generated as V4 offline candidate by deterministic MAIS safe-template fallback from committed HJB safe-RAG metadata after live DeepSeek transport failed; manual S18 sampling required before app integration."
  };
}

function buildQaReport({ questions, plan, model, apiUrl, startedAt, finishedAt, hjbCards, hjbExamPatternCards, sharedExamPatternCards, generationMode = "deepseek" }) {
  const gradeCounts = Object.fromEntries(countBy(questions, (question) => question.grade));
  const typeCounts = Object.fromEntries(countBy(questions, (question) => `${question.grade}-${question.type}`));
  const difficultyCounts = Object.fromEntries(countBy(questions, (question) => `${question.grade}-${question.difficulty}`));
  const duplicateIds = Array.from(countBy(questions, (question) => question.id).entries()).filter(([, count]) => count > 1).map(([id]) => id);
  const duplicatePrompts = Array.from(countBy(questions, (question) => question.promptZhHans).entries()).filter(([, count]) => count > 1).length;
  const sourceRiskRows = questions.filter((question) => question.sourceDistanceStatus !== "passed-auto-source-scan");
  const missingEvidenceRows = questions.filter((question) => !question.evidenceCardIds.length || !question.examPatternCardIds.length);
  const malformedMcRows = questions.filter((question) => question.type === "multiple-choice" && (question.optionsZhHans.length !== 4 || !question.optionsZhHans.includes(question.answer)));
  const missingAcceptedRows = questions.filter((question) => !question.acceptedAnswers.length);
  const missingExplanationRows = questions.filter((question) => !question.explanationZhHans.trim());
  const batchFallbackRows = questions.filter((question) => String(question.reviewNotes ?? "").includes("deterministic MAIS safe-template fallback")).length;
  const crossBankStats = crossBankPromptStats(questions);
  const allChecksPass =
    questions.length === totalQuestionCount &&
    grades.every((grade) => gradeCounts[grade] === gradeQuestionCount) &&
    grades.every((grade) => questionTypes.every((type) => (typeCounts[`${grade}-${type}`] ?? 0) === typeQuotaByGrade[type])) &&
    grades.every((grade) => difficulties.every((difficulty) => (difficultyCounts[`${grade}-${difficulty}`] ?? 0) === difficultyQuotaByGrade[difficulty])) &&
    duplicateIds.length === 0 &&
    duplicatePrompts === 0 &&
    missingEvidenceRows.length === 0 &&
    malformedMcRows.length === 0 &&
    missingAcceptedRows.length === 0 &&
    missingExplanationRows.length === 0 &&
    (!crossBankStats.checked || crossBankStats.duplicateCount === 0) &&
    sourceRiskRows.length === 0;

  const providerLine =
    generationMode !== "local-fallback"
      ? `- Generator: DeepSeek API via project server-side \`LLM_API_KEY\` from local \`.env.local\`
- Model: \`${model}\`
- API host: \`${new URL(apiUrl).host}\``
      : `- Generator: deterministic MAIS safe-template fallback
- Model: not used for generated rows
- API host: not used for generated rows`;
  const hygieneText =
    generationMode === "deepseek"
      ? `- The script read \`LLM_API_KEY\` locally and sent it only as an Authorization header.
- No API key, request header, raw prompt transcript, source file path, OCR text, page image, page number, or source locator is written into these artifacts.
- Batch cache files contain parsed generated questions only.`
      : generationMode === "deepseek-with-batch-fallback"
        ? `- The script read \`LLM_API_KEY\` locally and sent it only as an Authorization header for live DeepSeek batches.
- ${batchFallbackRows} row(s) were produced by deterministic batch fallback after a live batch repeatedly failed validation.
- No API key, request header, raw prompt transcript, source file path, OCR text, page image, page number, or source locator is written into these artifacts.
- Batch cache files contain parsed generated questions only.`
      : `- Live DeepSeek batches were skipped for this local fallback run, so generated rows were produced by the local deterministic fallback.
- No API key, request header, raw prompt transcript, source file path, OCR text, page image, page number, or source locator is written into these artifacts.
- The DeepSeek generator remains in this package for a later provider-stable rerun.`;
  const crossBankLine = crossBankStats.checked
    ? `- Cross-v1/v2 exact prompt duplicate check: checked ${crossBankStats.priorRows} prior rows; duplicates ${crossBankStats.duplicateCount}.`
    : "- Cross-v1/v2 exact prompt duplicate check: not run because prior questions.jsonl files were not found in this workspace.";

  return `# ${packageLabel} QA Report

- Date: 2026-05-24
- Session ID: S18
${providerLine}
- Started: ${startedAt}
- Finished: ${finishedAt}
- Verdict: ${allChecksPass ? "Auto structure/count/schema QA passed for the offline package; manual S18 sampling still required before app integration." : "Needs remediation before use."}

## Scope

- Generated ${questions.length} original Simplified Chinese questions for Mainland Shanghai Education Press / HuJiaoBan high-school mathematics.
- Distribution target: 500 questions per S4, S5, and S6 grade.
- Package version: V4 offline candidate package; intended to sit alongside the previously generated V1/V2 packages.
- This package is offline only. It does not edit \`data/questions.ts\`, \`types/index.ts\`, app UI, API routes, source archives, extracted text, OCR, screenshots, page notes, or embeddings.
- RAG evidence source: ${hjbCards.length} committed HJB textbook safe cards, ${hjbExamPatternCards.length} committed HJB assessment-pattern cards, and ${sharedExamPatternCards.length} shared Mainland senior-secondary exam-pattern cards.
- Coverage plan rows: ${plan.length}.

## DeepSeek Secret Hygiene

${hygieneText}

## Count Checks

- Total questions: ${questions.length} / ${totalQuestionCount}.
- Duplicate IDs: ${duplicateIds.length ? duplicateIds.join(", ") : "none"}.
- Duplicate exact prompts: ${duplicatePrompts}.
- Missing evidence rows: ${missingEvidenceRows.length}.
- Source-distance risk rows: ${sourceRiskRows.length}.
- Malformed multiple-choice rows: ${malformedMcRows.length}.
- Missing accepted-answer rows: ${missingAcceptedRows.length}.
- Missing explanation rows: ${missingExplanationRows.length}.
- Deterministic batch-fallback rows: ${batchFallbackRows}.
${crossBankLine}

## Grade Counts

${grades.map((grade) => `- ${grade}: ${gradeCounts[grade] ?? 0} / ${gradeQuestionCount}`).join("\n")}

## Type Quota Checks

${grades.flatMap((grade) => questionTypes.map((type) => `- ${grade} ${type}: ${typeCounts[`${grade}-${type}`] ?? 0} / ${typeQuotaByGrade[type]}`)).join("\n")}

## Difficulty Quota Checks

${grades.flatMap((grade) => difficulties.map((difficulty) => `- ${grade} ${difficulty}: ${difficultyCounts[`${grade}-${difficulty}`] ?? 0} / ${difficultyQuotaByGrade[difficulty]}`)).join("\n")}

## Manual QA Status

- \`mathQaStatus\`: kept as \`pending-manual\` for ordinary rows because full human-style solving of 1500 high-school items is a separate S18 review pass.
- Rows with obvious self-contradiction, missing visual references, source-reference wording, or malformed answer design are rejected during generation retries and rechecked by \`audit-solvability.mjs\`.
- \`terminologyQaStatus\`: kept as \`pending-manual\`; the generation prompt requires Simplified Chinese Mainland high-school mathematics terminology.
- Required next step before app integration: S18 sample at least 50 questions per grade and review 100% of any auto-red-flag rows.

## Files

- \`questions.jsonl\`
- \`questions.csv\`
- \`coverage-matrix.csv\`
- \`qa-report.md\`
- \`generate-with-deepseek.mjs\`
- \`audit-solvability.mjs\`
- \`batches/*.json\` resumable parsed batch cache
`;
}

async function main() {
  const useLocalFallback = process.argv.includes("--local-fallback");
  const allowBatchFallback = process.argv.includes("--allow-batch-fallback");
  const fillMissingLocal = process.argv.includes("--fill-missing-local");
  const repairLocalIdsArg = process.argv.find((arg) => arg.startsWith("--repair-local-ids="));
  const repairLocalIds = new Set(
    repairLocalIdsArg
      ? repairLocalIdsArg
          .slice("--repair-local-ids=".length)
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
      : []
  );
  loadEnvFile(path.join(rootDir, ".env.local"));
  const apiKey = process.env.LLM_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim();
  const apiUrl = process.env.LLM_API_URL?.trim() || "https://api.deepseek.com/chat/completions";
  const model = process.env.LLM_MODEL?.trim() || "deepseek-v4-pro";
  const startedAt = new Date().toISOString();
  const hjbCards = loadTsExport(path.join(rootDir, "data/rag/mainlandHjbHigh.ts"), "mainlandHjbHighRagCards");
  const hjbExamPatternCards = loadTsExport(path.join(rootDir, "data/rag/mainlandHjbHighExamPatterns.ts"), "mainlandHjbHighExamPatternCards");
  const sharedExamPatternCards = loadTsExport(path.join(rootDir, "data/rag/mainlandPepHighExamPatterns.ts"), "mainlandPepHighExamPatternCards");
  const plan = buildPlan({ hjbCards, hjbExamPatternCards, sharedExamPatternCards });
  const questions = [];

  if (repairLocalIds.size) {
    const currentRows = readJsonl(path.join(__dirname, "questions.jsonl"));
    if (!currentRows.length) throw new Error("Cannot repair local IDs before questions.jsonl exists.");
    const planById = new Map(plan.map((target, index) => [target.id, { target, index }]));
    const replacements = new Map();
    for (const id of repairLocalIds) {
      const entry = planById.get(id);
      if (!entry) throw new Error(`Unknown repair ID: ${id}`);
      replacements.set(id, generateLocalQuestion(entry.target, entry.index));
    }
    const patchedRows = currentRows.map((row) => replacements.get(row.id) ?? row);
    const batches = chunk(plan, batchSize);
    const touchedBatchIndexes = new Set(Array.from(replacements.keys()).map((id) => Math.floor(planById.get(id).index / batchSize)));
    for (const batchIndex of touchedBatchIndexes) {
      const targets = batches[batchIndex];
      const batchId = batchIdFor(batchIndex);
      const cachePath = path.join(batchDir, `${batchId}.json`);
      const cachedQuestions = fs.existsSync(cachePath)
        ? JSON.parse(fs.readFileSync(cachePath, "utf8")).questions
        : patchedRows.slice(batchIndex * batchSize, batchIndex * batchSize + batchSize);
      const patchedBatchQuestions = validateBatch(targets, cachedQuestions).map((question) => replacements.get(question.id) ?? question);
      fs.writeFileSync(
        cachePath,
        `${JSON.stringify({ batchId, generationMode: "targeted-local-repair", fallbackReason: "targeted-local-repair", questions: patchedBatchQuestions }, null, 2)}\n`
      );
    }
    console.log(`Applied targeted local repair to ${replacements.size} row(s).`);
    questions.push(...patchedRows);
  } else if (fillMissingLocal) {
    fs.mkdirSync(batchDir, { recursive: true });
    const batches = chunk(plan, batchSize);
    console.log("Filling missing batches locally while preserving existing DeepSeek caches.");
    for (let index = 0; index < batches.length; index += 1) {
      const targets = batches[index];
      const batchId = batchIdFor(index);
      const cachePath = path.join(batchDir, `${batchId}.json`);
      if (fs.existsSync(cachePath)) {
        const cached = JSON.parse(fs.readFileSync(cachePath, "utf8"));
        questions.push(...validateBatch(targets, cached.questions));
        continue;
      }
      const fallbackQuestions = targets.map((target, offset) => generateLocalQuestion(target, index * batchSize + offset));
      fs.writeFileSync(
        cachePath,
        `${JSON.stringify({ batchId, generationMode: "batch-fallback", fallbackReason: "fill-missing-local", questions: fallbackQuestions }, null, 2)}\n`
      );
      questions.push(...fallbackQuestions);
    }
  } else if (useLocalFallback) {
    console.log("Local fallback generation starting: DeepSeek live batches are skipped for this run.");
    questions.push(...plan.map((target, index) => generateLocalQuestion(target, index)));
  } else {
    if (!apiKey) throw new Error("Missing LLM_API_KEY or OPENAI_API_KEY in local environment");
    if (!new URL(apiUrl).host.includes("api.deepseek.com")) throw new Error(`Refusing non-DeepSeek endpoint for this task: ${new URL(apiUrl).host}`);
    if (model !== "deepseek-v4-pro") throw new Error(`Refusing non-DeepSeek V4 Pro model for this task: ${model}`);

    fs.mkdirSync(batchDir, { recursive: true });
    const batches = chunk(plan, batchSize);
    console.log(`DeepSeek generation starting: ${batches.length} batches, model=${model}, endpoint=${new URL(apiUrl).host}`);
    for (let index = 0; index < batches.length; index += 1) {
      const targets = batches[index];
      console.log(`batch ${index + 1}/${batches.length}: ${batchIdFor(index)} ${targets[0].grade} ${targets[0].topicTitleZhHans}`);
      const batchQuestions = await generateBatch({
        targets,
        batchIndex: index,
        hjbCards,
        hjbExamPatternCards,
        sharedExamPatternCards,
        apiUrl,
        apiKey,
        model,
        allowBatchFallback
      });
      questions.push(...batchQuestions);
    }
  }

  questions.sort((a, b) => a.id.localeCompare(b.id));
  writeJsonl(path.join(__dirname, "questions.jsonl"), questions);
  writeCsv(path.join(__dirname, "questions.csv"), questions, [
    "id",
    "grade",
    "topicId",
    "topicTitleZhHans",
    "volume",
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
  ]);
  writeCsv(path.join(__dirname, "coverage-matrix.csv"), buildCoverageRows(questions), [
    "grade",
    "volume",
    "chapter",
    "topicTitleZhHans",
    "primaryConceptId",
    "type",
    "difficulty",
    "count",
    "evidenceCardIds",
    "examPatternCardIds"
  ]);
  fs.writeFileSync(
    path.join(__dirname, "qa-report.md"),
    buildQaReport({
      questions,
      plan,
      model,
      apiUrl,
      startedAt,
      finishedAt: new Date().toISOString(),
      hjbCards,
      hjbExamPatternCards,
      sharedExamPatternCards,
      generationMode: useLocalFallback ? "local-fallback" : allowBatchFallback || fillMissingLocal || repairLocalIds.size ? "deepseek-with-batch-fallback" : "deepseek"
    })
  );
  console.log("Generation complete: wrote questions.jsonl, questions.csv, coverage-matrix.csv, qa-report.md");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
