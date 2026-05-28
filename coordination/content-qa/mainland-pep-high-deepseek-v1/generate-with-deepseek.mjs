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

const grades = ["S4", "S5", "S6"];
const types = ["multiple-choice", "fill-in", "short-answer"];
const typePlanPerTen = [
  "multiple-choice",
  "fill-in",
  "short-answer",
  "short-answer",
  "multiple-choice",
  "fill-in",
  "short-answer",
  "multiple-choice",
  "fill-in",
  "short-answer"
];

const topicCountsByGrade = {
  S4: 70,
  S5: 140,
  S6: 100
};

const difficultyQuotas = {
  S4: { Foundation: 140, Core: 315, Challenge: 175, Exam: 70 },
  S5: { Foundation: 105, Core: 280, Challenge: 210, Exam: 105 },
  S6: { Foundation: 70, Core: 210, Challenge: 245, Exam: 175 }
};

const topicChapterById = {
  "pep-high-s4-sets-logic": "集合与常用逻辑用语",
  "pep-high-s4-quadratic-inequalities": "一元二次函数、方程和不等式",
  "pep-high-s4-function-properties": "函数的概念与性质",
  "pep-high-s4-exp-log": "指数函数与对数函数",
  "pep-high-s4-trigonometry": "三角函数",
  "pep-high-s4-plane-vectors": "平面向量及其应用",
  "pep-high-s4-complex-numbers": "复数",
  "pep-high-s4-solid-geometry-intro": "立体几何初步",
  "pep-high-s4-statistics": "统计",
  "pep-high-s4-probability": "概率",
  "pep-high-s5-space-vectors": "空间向量与立体几何",
  "pep-high-s5-lines-circles": "直线和圆的方程",
  "pep-high-s5-conics": "圆锥曲线的方程",
  "pep-high-s5-sequences": "数列",
  "pep-high-s5-derivatives": "一元函数的导数及其应用",
  "pep-high-s6-counting": "计数原理",
  "pep-high-s6-random-variables": "随机变量及其分布",
  "pep-high-s6-bivariate-data": "成对数据的统计分析",
  "pep-high-s6-derivative-synthesis": "一元函数的导数及其应用",
  "pep-high-s6-analytic-geometry-synthesis": "圆锥曲线的方程",
  "pep-high-s6-probability-statistics-synthesis": "概率",
  "pep-high-s6-exam-practice": "综合复习与跨章节建模"
};

const topicEvidenceOverrides = {
  "pep-high-s4-sets-logic": {
    ragCardIds: ["pep-high-sets-logic", "pep-high-logic-quantifiers-conditions"],
    examPatternCardIds: ["s18-remediation-s4-sets-logic-pattern"],
    allowedConceptIds: ["sets", "set-operations", "logic-conditions", "quantifiers", "propositions", "proof-language"]
  },
  "pep-high-s4-quadratic-inequalities": {
    ragCardIds: ["pep-high-quadratic-inequalities"],
    examPatternCardIds: ["pep-high-exam-basic-inequality-optimization"],
    allowedConceptIds: ["quadratic-functions", "quadratic-equations", "quadratic-inequalities", "basic-inequality", "inequality-properties", "algebraic-transformations"]
  },
  "pep-high-s4-function-properties": {
    ragCardIds: ["pep-high-function-concepts-properties"],
    examPatternCardIds: ["pep-high-exam-functions-parameters"],
    allowedConceptIds: ["function-definition", "domain-range", "monotonicity", "parity", "function-applications", "function-inequalities"]
  },
  "pep-high-s4-exp-log": {
    ragCardIds: ["pep-high-exponential-logarithmic-functions", "pep-high-function-zero-modeling"],
    examPatternCardIds: ["pep-high-exam-function-zero-models"],
    allowedConceptIds: ["exponential-functions", "logarithmic-functions", "inverse-functions", "function-modeling", "function-zero", "growth-comparison"]
  },
  "pep-high-s4-trigonometry": {
    ragCardIds: ["pep-high-trigonometric-functions", "pep-high-trigonometric-identities-transformations"],
    examPatternCardIds: ["pep-high-exam-trigonometric-graphs"],
    allowedConceptIds: ["unit-circle", "trigonometric-functions", "trigonometric-graphs", "trigonometric-identities", "angle-sum-formulas", "double-angle-formulas"]
  },
  "pep-high-s4-plane-vectors": {
    ragCardIds: ["pep-high-plane-vectors", "pep-high-sine-cosine-theorems"],
    examPatternCardIds: ["pep-high-exam-sine-cosine-vector-applications"],
    allowedConceptIds: ["plane-vectors", "vector-operations", "dot-product", "vector-applications", "sine-theorem", "cosine-theorem", "triangle-modeling"]
  },
  "pep-high-s4-complex-numbers": {
    ragCardIds: ["pep-high-complex-numbers"],
    examPatternCardIds: ["s18-remediation-s4-complex-numbers-pattern"],
    allowedConceptIds: ["complex-numbers", "complex-operations", "complex-plane", "complex-roots"]
  }
};

const requiredColumns = [
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

const forbiddenSourcePattern =
  /OCR|PDF|DOCX|docx|zip|截图|扫描|页码|第\s*\d+\s*页|教材原题|课本原题|试卷原题|高考真题|官方解析|答案原句|原文|源文件|来源文件|source locator|as shown|shown in the figure|如图|见图|上图|下图|(^|[，。；：、\s])图中/i;
const mathRedFlagPattern =
  /设计有误|选项中没有|条件不足|重新计算|但选项|但题目|答案不唯一|可能有误|题目误写|重新生成|我将|根据输出要求|不能指出题目错误|作为AI|模型|抱歉/i;

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
    if (specifier.startsWith("@/")) {
      return loadTsModule(path.join(rootDir, `${specifier.slice(2)}.ts`), cache);
    }
    if (specifier.startsWith(".")) {
      return loadTsModule(path.resolve(path.dirname(resolvedPath), specifier), cache);
    }
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

function compactCurriculumCard(card) {
  return {
    id: card.id,
    chapter: card.chapter,
    conceptIds: card.conceptIds,
    competencyTags: card.competencyTags,
    itemTypeTags: card.itemTypeTags,
    difficultyBand: card.difficultyBand,
    safeSummary: card.safeSummary,
    generationGuidance: card.generationGuidance.slice(0, 2),
    misconceptionTags: card.misconceptionTags.slice(0, 3)
  };
}

function compactPatternCard(card) {
  return {
    id: card.id,
    yearRange: card.yearRange,
    chapter: card.chapter,
    conceptIds: card.conceptIds,
    competencyTags: card.competencyTags,
    itemTypeTags: card.itemTypeTags,
    difficultyBand: card.difficultyBand,
    patternSummary: card.patternSummary,
    solutionStrategyTags: card.solutionStrategyTags.slice(0, 3),
    misconceptionTags: card.misconceptionTags.slice(0, 3),
    generationGuidance: card.generationGuidance.slice(0, 2)
  };
}

function hasConceptOverlap(left = [], right = []) {
  const rightSet = new Set(right);
  return left.some((value) => rightSet.has(value));
}

function evidenceForTopic(topic, ragCards, patternCards) {
  const chapter = topicChapterById[topic.id] ?? topic.title.zh;
  const override = topicEvidenceOverrides[topic.id];
  if (override) {
    const selectedRagCards = override.ragCardIds
      .map((id) => ragCards.find((card) => card.id === id))
      .filter(Boolean);
    const selectedPatternCards = override.examPatternCardIds
      .map((id) => patternCards.find((card) => card.id === id))
      .filter(Boolean);
    const allowed = new Set(override.allowedConceptIds);
    const conceptIds = unique([
      ...selectedRagCards.flatMap((card) => card.conceptIds),
      ...selectedPatternCards.flatMap((card) => card.conceptIds)
    ]).filter((conceptId) => allowed.has(conceptId));

    return {
      chapter,
      conceptIds: conceptIds.length ? conceptIds : override.allowedConceptIds,
      evidenceCardIds: selectedRagCards.map((card) => card.id),
      examPatternCardIds: override.examPatternCardIds
    };
  }

  const exactRagCards = ragCards.filter((card) => card.chapter === chapter);
  const inferredConcepts = unique(exactRagCards.flatMap((card) => card.conceptIds));
  const conceptRagCards = ragCards.filter((card) => hasConceptOverlap(card.conceptIds, inferredConcepts));
  const selectedRagCards = unique([...exactRagCards, ...conceptRagCards].map((card) => card.id))
    .map((id) => ragCards.find((card) => card.id === id))
    .filter(Boolean)
    .slice(0, 3);

  const exactPatternCards = patternCards.filter((card) => card.chapter === chapter);
  const conceptPatternCards = patternCards.filter((card) => hasConceptOverlap(card.conceptIds, inferredConcepts));
  const selectedPatternCards = unique([...exactPatternCards, ...conceptPatternCards].map((card) => card.id))
    .map((id) => patternCards.find((card) => card.id === id))
    .filter(Boolean)
    .slice(0, 2);

  const fallbackRagCards = (selectedRagCards.length ? selectedRagCards : ragCards).slice(0, 1);
  const fallbackPatternCards = (selectedPatternCards.length ? selectedPatternCards : patternCards).slice(0, 1);

  return {
    chapter,
    conceptIds: unique([
      ...fallbackRagCards.flatMap((card) => card.conceptIds),
      ...fallbackPatternCards.flatMap((card) => card.conceptIds)
    ]).slice(0, 10),
    evidenceCardIds: fallbackRagCards.map((card) => card.id),
    examPatternCardIds: fallbackPatternCards.map((card) => card.id)
  };
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

function slugForTopic(topicId) {
  return topicId.replace(/^pep-high-/, "").replace(/[^a-z0-9-]/gi, "-").toLowerCase();
}

function buildPlan(topics, ragCards, patternCards) {
  const rows = [];
  for (const grade of grades) {
    const gradeTopics = topics.filter((topic) => topic.grade === grade);
    const difficultyPlan = balancedSequence(difficultyQuotas[grade]);
    let difficultyIndex = 0;

    for (const topic of gradeTopics) {
      const topicCount = topicCountsByGrade[grade];
      const evidence = evidenceForTopic(topic, ragCards, patternCards);
      for (let index = 0; index < topicCount; index += 1) {
        const serial = String(index + 1).padStart(3, "0");
        rows.push({
          id: `pep-high-ds-v1-${slugForTopic(topic.id)}-${serial}`,
          grade,
          topicId: topic.id,
          topicTitleZhHans: topic.title.zh,
          chapter: evidence.chapter,
          conceptIds: evidence.conceptIds,
          difficulty: difficultyPlan[difficultyIndex++],
          type: typePlanPerTen[index % typePlanPerTen.length],
          evidenceCardIds: evidence.evidenceCardIds,
          examPatternCardIds: evidence.examPatternCardIds
        });
      }
    }
  }
  return rows;
}

function chunk(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) chunks.push(values.slice(index, index + size));
  return chunks;
}

function batchIdFor(targets) {
  const first = targets[0];
  const start = first.id.match(/-(\d{3})$/)?.[1] ?? "001";
  return `${first.grade}-${slugForTopic(first.topicId)}-${String(Math.ceil(Number(start) / 10)).padStart(2, "0")}`;
}

function systemPrompt() {
  return [
    "你是 MAIS 的内地人教版高中数学原创题生成与审核专家。",
    "任务是根据安全 RAG 摘要和聚合考试模式生成原创高中数学题。",
    "必须使用简体中文和内地高中数学术语。",
    "不得复制、改写、翻译、近似重构教材、练习册、试卷、答案、图表、页面、版式或解法原文。",
    "不得提到来源文件、PDF、DOCX、OCR、页码、截图、试卷原题、教材原题、官方解析或任何 source locator。",
    "不要写“如图”“见图”“上图”“下图”“图中”，题目必须不依赖外部图片也能完整作答。",
    "每题必须唯一可解；选择题只有一个正确选项，并且 answer 必须等于 optionsZhHans 中的完整选项文本，不要只写 A/B/C/D。",
    "填空题和解答题 optionsZhHans 必须是空数组。",
    "acceptedAnswers 必须包含 answer；解释必须直接支持 answer，不能与 answer 或选项矛盾。",
    "解析控制在 120 个汉字以内，不要写推测、反复自我纠错、题目修改建议或模型思考过程。",
    "只输出紧凑 JSON object，不要 Markdown，不要代码块，不要额外说明，不要美化换行。",
    "输出示例形状：{\"questions\":[{\"id\":\"exact-id\",\"promptZhHans\":\"题干\",\"optionsZhHans\":[\"选项1\",\"选项2\",\"选项3\",\"选项4\"],\"answer\":\"选项1\",\"acceptedAnswers\":[\"选项1\"],\"explanationZhHans\":\"解析\"}]}"
  ].join("\n");
}

function userPrompt({ targets, curriculumCards, patternCards }) {
  return JSON.stringify({
    task: `Generate exactly ${targets.length} original Mainland PEP high-school math question${targets.length === 1 ? "" : "s"}.`,
    outputContract: {
      root: "questions",
      perQuestionFields: ["id", "promptZhHans", "optionsZhHans", "answer", "acceptedAnswers", "explanationZhHans"],
      rules: [
        `Return exactly one JSON object: {"questions":[...${targets.length} item${targets.length === 1 ? "" : "s"}...]}`,
        "Use the exact target id for each question.",
        "Use only Simplified Chinese in promptZhHans, optionsZhHans, answer, acceptedAnswers, and explanationZhHans.",
        "For multiple-choice, optionsZhHans must contain exactly 4 strings and answer must exactly equal one full option string.",
        "For fill-in and short-answer, optionsZhHans must be an empty array.",
        "acceptedAnswers must include the canonical answer.",
        "Explanation must be concise and must show enough reasoning to verify the answer.",
        "Explanation must not say the question is wrong, under-specified, missing options, or has multiple possible answers.",
        "Do not invent unseen diagrams; any graph, table, solid, chart, or figure must be fully described in text.",
        "Use only the target grade, topic, chapter, conceptIds, difficulty, and type.",
        "For S4 topics other than an explicitly derivative-related target, do not use derivatives, tangent slope, extrema, conic sections, random variables, permutations, combinations, or other later-course concepts.",
        "If a target has a remediation exam-pattern id beginning with s18-remediation-, treat it as a local topic-specific pattern guard and rely on the safe curriculum evidence only.",
        "Create fresh numbers, contexts, text-described diagrams, distractors, and solution paths.",
        "Do not include raw source titles, page numbers, source file paths, OCR details, or official exam/textbook references."
      ]
    },
    targets,
    safeCurriculumEvidence: curriculumCards.map(compactCurriculumCard),
    safeExamPatternEvidence: patternCards.map(compactPatternCard)
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

function sanitizedErrorText(text, apiKey) {
  return text.replaceAll(apiKey, "[REDACTED_API_KEY]").slice(0, 1200);
}

async function postDeepSeek({ apiUrl, apiKey, model, messages, maxTokens = 9000, attempt = 0 }) {
  const body = {
    model,
    messages,
    response_format: { type: "json_object" },
    thinking: { type: "disabled" },
    stream: false,
    max_tokens: maxTokens,
    temperature: 0.45
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 240000);
  try {
    let response;
    try {
      response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Connection": "close",
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });
    } catch (error) {
      const name = error?.name ? `${error.name}: ` : "";
      throw new Error(`DeepSeek transport error: ${name}${error?.message ?? error}`);
    }
    const text = await response.text();
    if (!response.ok) {
      const safeText = sanitizedErrorText(text, apiKey);
      if ((response.status === 429 || response.status >= 500) && attempt < 3) {
        await sleep(2500 * (attempt + 1));
        return postDeepSeek({ apiUrl, apiKey, model, messages, maxTokens, attempt: attempt + 1 });
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
  if (!Array.isArray(raw.acceptedAnswers)) errors.push("acceptedAnswers must be an array");
  if (!acceptedAnswers.includes(answer)) errors.push("acceptedAnswers must include answer");

  if (target.type === "multiple-choice") {
    if (optionsZhHans.length !== 4) errors.push(`multiple-choice options length ${optionsZhHans.length}`);
    if (optionsZhHans.filter((option) => option === answer).length !== 1) {
      errors.push("multiple-choice answer does not match exactly one full option");
    }
    if (new Set(optionsZhHans).size !== optionsZhHans.length) errors.push("multiple-choice duplicate options");
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

  const riskText = sourceRiskText(normalized);
  if (forbiddenSourcePattern.test(riskText)) errors.push("source-distance forbidden wording");
  if (mathRedFlagPattern.test(riskText)) errors.push("math/self-correction red-flag wording");

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

async function requestQuestions({ targets, ragCards, patternCards, apiUrl, apiKey, model }) {
  const evidenceCardIds = unique(targets.flatMap((target) => target.evidenceCardIds));
  const examPatternCardIds = unique(targets.flatMap((target) => target.examPatternCardIds));
  const relevantCurriculumCards = ragCards.filter((card) => evidenceCardIds.includes(card.id));
  const relevantPatternCards = patternCards.filter((card) => examPatternCardIds.includes(card.id));

  const messages = [
    { role: "system", content: systemPrompt() },
    {
      role: "user",
      content: userPrompt({
        targets,
        curriculumCards: relevantCurriculumCards,
        patternCards: relevantPatternCards
      })
    }
  ];

  let lastError = null;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const content = await postDeepSeek({ apiUrl, apiKey, model, messages });
      const parsed = extractJsonObject(content);
      const normalized = validateBatch(targets, parsed.questions);
      return normalized;
    } catch (error) {
      lastError = error;
      if (attempt < 4) await sleep(6000 * attempt);
    }
  }
  throw lastError;
}

async function requestQuestionsWithFallback({ targets, ragCards, patternCards, apiUrl, apiKey, model }) {
  try {
    return await requestQuestions({ targets, ragCards, patternCards, apiUrl, apiKey, model });
  } catch (error) {
    if (targets.length === 1) throw error;
    const midpoint = Math.ceil(targets.length / 2);
    console.error(`splitting ${targets[0].id}..${targets.at(-1).id} after provider failure: ${String(error?.message ?? error).replace(/sk-[A-Za-z0-9]+/g, "[REDACTED_API_KEY]")}`);
    const left = await requestQuestionsWithFallback({
      targets: targets.slice(0, midpoint),
      ragCards,
      patternCards,
      apiUrl,
      apiKey,
      model
    });
    const right = await requestQuestionsWithFallback({
      targets: targets.slice(midpoint),
      ragCards,
      patternCards,
      apiUrl,
      apiKey,
      model
    });
    return [...left, ...right];
  }
}

async function generateBatch({ targets, ragCards, patternCards, apiUrl, apiKey, model }) {
  const batchId = batchIdFor(targets);
  const cachePath = path.join(batchDir, `${batchId}.json`);
  if (fs.existsSync(cachePath)) {
    const cached = JSON.parse(fs.readFileSync(cachePath, "utf8"));
    const normalized = validateBatch(targets, cached.questions);
    fs.writeFileSync(cachePath, `${JSON.stringify({ batchId, questions: normalized }, null, 2)}\n`);
    return normalized;
  }

  try {
    const internalChunkSize = Math.max(1, Math.min(10, Number(process.env.MAINLAND_HIGH_DEEPSEEK_INTERNAL_CHUNK_SIZE ?? 2) || 2));
    const normalized = [];
    for (const targetChunk of chunk(targets, internalChunkSize)) {
      normalized.push(...await requestQuestionsWithFallback({ targets: targetChunk, ragCards, patternCards, apiUrl, apiKey, model }));
    }
    validateBatch(targets, normalized);
    fs.writeFileSync(cachePath, `${JSON.stringify({ batchId, questions: normalized }, null, 2)}\n`);
    return normalized;
  } catch (error) {
    throw new Error(`Batch ${batchId} failed after retries: ${error?.message ?? error}`);
  }
}

function csvEscape(value) {
  const text = (Array.isArray(value) ? value.join(" | ") : String(value ?? "")).replace(/\s*\r?\n\s*/g, " ");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function writeJsonl(filePath, rows) {
  fs.writeFileSync(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
}

function writeCsv(filePath, rows, columns) {
  const lines = [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))
  ];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function countBy(rows, keyFn) {
  const counts = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function normalizePrompt(text) {
  return String(text ?? "").replace(/\s+/g, "");
}

function canonicalPrompt(text) {
  return normalizePrompt(text)
    .replace(/[0-9]+(?:\.[0-9]+)?/g, "#")
    .replace(/[一二三四五六七八九十百千万]+/g, "中数")
    .replace(/[A-D][.．、]/g, "")
    .toLowerCase();
}

function existingHighPromptSet() {
  const module = loadTsModule(path.join(rootDir, "data/mainlandPepHighQuestions.ts"));
  const rows = [
    ...(module.mainlandPepHighQuestions ?? []),
    ...(module.mainlandPepHighRagV4CandidateQuestions ?? [])
  ];
  return new Set(rows.map((question) => normalizePrompt(question.prompt?.zh)));
}

function buildCoverageRows(questions) {
  const grouped = countBy(questions, (question) => [
    question.grade,
    question.topicId,
    question.topicTitleZhHans,
    question.chapter,
    question.type,
    question.difficulty,
    question.evidenceCardIds.join("|"),
    question.examPatternCardIds.join("|")
  ].join("\t"));
  return Array.from(grouped.entries()).map(([key, count]) => {
    const [grade, topicId, topicTitleZhHans, chapter, type, difficulty, evidenceCardIds, examPatternCardIds] = key.split("\t");
    return { grade, topicId, topicTitleZhHans, chapter, type, difficulty, count, evidenceCardIds, examPatternCardIds };
  }).sort((a, b) => a.grade.localeCompare(b.grade) || a.topicId.localeCompare(b.topicId) || a.type.localeCompare(b.type));
}

function buildManualReviewQueue(questions) {
  const canonicalCounts = countBy(questions, (question) => canonicalPrompt(question.promptZhHans));
  const flagged = questions.filter((question) => {
    const riskText = sourceRiskText(question);
    return forbiddenSourcePattern.test(riskText)
      || mathRedFlagPattern.test(riskText)
      || (canonicalCounts.get(canonicalPrompt(question.promptZhHans)) ?? 0) > 10;
  });

  const balancedSamples = [];
  for (const topicId of unique(questions.map((question) => question.topicId))) {
    const topicRows = questions.filter((question) => question.topicId === topicId);
    balancedSamples.push(...topicRows.slice(0, 10));
  }

  const byId = new Map([...flagged, ...balancedSamples].map((question) => [question.id, question]));
  return Array.from(byId.values()).sort((a, b) => a.id.localeCompare(b.id));
}

function validateFullPackage({ questions, plan, topics, ragCards, patternCards, existingPrompts }) {
  const issues = [];
  const idCounts = countBy(questions, (question) => question.id);
  const promptCounts = countBy(questions, (question) => normalizePrompt(question.promptZhHans));
  const ragCardIds = new Set(ragCards.map((card) => card.id));
  const patternCardIds = new Set(patternCards.map((card) => card.id));

  if (questions.length !== 2100) issues.push(`total questions ${questions.length} != 2100`);
  for (const grade of grades) {
    const gradeCount = questions.filter((question) => question.grade === grade).length;
    if (gradeCount !== 700) issues.push(`${grade} count ${gradeCount} != 700`);
  }

  for (const topic of topics.filter((topic) => grades.includes(topic.grade))) {
    const expected = topicCountsByGrade[topic.grade];
    const actual = questions.filter((question) => question.topicId === topic.id).length;
    if (actual !== expected) issues.push(`${topic.id} count ${actual} != ${expected}`);
  }

  for (const grade of grades) {
    const gradeRows = questions.filter((question) => question.grade === grade);
    const typeCounts = Object.fromEntries(countBy(gradeRows, (question) => question.type));
    if (typeCounts["multiple-choice"] !== 210) issues.push(`${grade} multiple-choice count ${typeCounts["multiple-choice"] ?? 0} != 210`);
    if (typeCounts["fill-in"] !== 210) issues.push(`${grade} fill-in count ${typeCounts["fill-in"] ?? 0} != 210`);
    if (typeCounts["short-answer"] !== 280) issues.push(`${grade} short-answer count ${typeCounts["short-answer"] ?? 0} != 280`);

    const difficultyCounts = Object.fromEntries(countBy(gradeRows, (question) => question.difficulty));
    for (const [difficulty, expected] of Object.entries(difficultyQuotas[grade])) {
      if (difficultyCounts[difficulty] !== expected) {
        issues.push(`${grade} ${difficulty} count ${difficultyCounts[difficulty] ?? 0} != ${expected}`);
      }
    }
  }

  const duplicateIds = Array.from(idCounts.entries()).filter(([, count]) => count > 1).map(([id]) => id);
  if (duplicateIds.length) issues.push(`duplicate ids: ${duplicateIds.slice(0, 5).join(", ")}`);

  const duplicatePrompts = Array.from(promptCounts.entries()).filter(([, count]) => count > 1).map(([prompt]) => prompt);
  if (duplicatePrompts.length) issues.push(`duplicate exact prompts: ${duplicatePrompts.length}`);

  const existingDuplicates = questions.filter((question) => existingPrompts.has(normalizePrompt(question.promptZhHans)));
  if (existingDuplicates.length) issues.push(`exact duplicates with existing high bank: ${existingDuplicates.length}`);

  for (const question of questions) {
    if (!plan.some((target) => target.id === question.id)) issues.push(`${question.id} is not in generation plan`);
    if (!question.evidenceCardIds.length) issues.push(`${question.id} missing evidence card`);
    if (!question.examPatternCardIds.length) issues.push(`${question.id} missing exam-pattern card`);
    if (!question.evidenceCardIds.every((id) => ragCardIds.has(id))) issues.push(`${question.id} unknown evidence card`);
    if (!question.examPatternCardIds.every((id) => patternCardIds.has(id))) issues.push(`${question.id} unknown exam-pattern card`);
    if (!question.acceptedAnswers.includes(question.answer)) issues.push(`${question.id} acceptedAnswers missing answer`);
    if (!question.explanationZhHans.trim()) issues.push(`${question.id} missing explanation`);
    if (forbiddenSourcePattern.test(sourceRiskText(question))) issues.push(`${question.id} source-distance risk`);
    if (mathRedFlagPattern.test(sourceRiskText(question))) issues.push(`${question.id} math/self-correction red flag`);

    if (question.type === "multiple-choice") {
      if (question.optionsZhHans.length !== 4) issues.push(`${question.id} malformed MC option count`);
      if (question.optionsZhHans.filter((option) => option === question.answer).length !== 1) {
        issues.push(`${question.id} MC answer not unique`);
      }
    } else if (question.optionsZhHans.length) {
      issues.push(`${question.id} non-choice has options`);
    }
  }

  return issues;
}

function buildQaReport({ questions, plan, topics, ragCards, patternCards, model, apiUrl, startedAt, finishedAt, validationIssues, manualReviewQueue }) {
  const gradeCounts = Object.fromEntries(countBy(questions, (question) => question.grade));
  const typeCounts = Object.fromEntries(countBy(questions, (question) => `${question.grade}-${question.type}`));
  const difficultyCounts = Object.fromEntries(countBy(questions, (question) => `${question.grade}-${question.difficulty}`));
  const topicCounts = Object.fromEntries(countBy(questions, (question) => question.topicId));
  const sourceRiskRows = questions.filter((question) => forbiddenSourcePattern.test(sourceRiskText(question)));
  const mathRedFlagRows = questions.filter((question) => mathRedFlagPattern.test(sourceRiskText(question)));
  const duplicateIds = Array.from(countBy(questions, (question) => question.id).entries()).filter(([, count]) => count > 1);
  const duplicatePrompts = Array.from(countBy(questions, (question) => normalizePrompt(question.promptZhHans)).entries()).filter(([, count]) => count > 1);
  const allChecksPass = validationIssues.length === 0;

  return `# Mainland PEP High DeepSeek V1 Offline Candidate Bank QA Report

- Date: ${hongKongDate()}
- Session ID: S18
- Generator: DeepSeek API via project server-side \`LLM_API_KEY\` from local environment
- Model: \`${model}\`
- API host: \`${new URL(apiUrl).host}\`
- Started: ${startedAt}
- Finished: ${finishedAt}
- Verdict: ${allChecksPass ? "Auto structure/count/schema/source-distance QA passed for the offline content package; manual S18 sampling still required before app integration." : "Needs remediation before use."}

## Scope

- Generated ${questions.length} original Simplified Chinese questions for Mainland PEP high-school mathematics.
- Distribution target: 700 questions each for S4, S5, and S6; topic-balanced across the committed high-school roadmap.
- This package is offline only. It does not edit \`data/mainlandPepHighQuestions.ts\`, \`data/questions.ts\`, \`types/index.ts\`, app UI, API routes, source archives, extracted text, OCR, screenshots, page notes, or embeddings.
- RAG evidence source: ${ragCards.length} committed high-school curriculum safe cards and ${patternCards.length} committed high-school exam-pattern safe cards.

## DeepSeek Secret Hygiene

- The script read \`LLM_API_KEY\` locally and sent it only as an Authorization header.
- No API key, request header, raw prompt transcript, source file path, OCR text, page image, page number, source locator, or reasoning content is written into these artifacts.
- Batch cache files contain parsed generated questions only.

## Count Checks

- Total questions: ${questions.length} / 2100.
- Duplicate IDs: ${duplicateIds.length ? duplicateIds.length : "none"}.
- Duplicate exact prompts inside candidate bank: ${duplicatePrompts.length}.
- Source-distance risk rows: ${sourceRiskRows.length}.
- Math red-flag rows: ${mathRedFlagRows.length}.
- Validation issues: ${validationIssues.length}.

## Grade Counts

${grades.map((grade) => `- ${grade}: ${gradeCounts[grade] ?? 0} / 700`).join("\n")}

## Type Quota Checks

${grades.flatMap((grade) => types.map((type) => {
  const expected = type === "short-answer" ? 280 : 210;
  const actual = typeCounts[`${grade}-${type}`] ?? 0;
  return `- ${grade} ${type}: ${actual} / ${expected}`;
})).join("\n")}

## Difficulty Quota Checks

${grades.flatMap((grade) => Object.entries(difficultyQuotas[grade]).map(([difficulty, expected]) => {
  const actual = difficultyCounts[`${grade}-${difficulty}`] ?? 0;
  return `- ${grade} ${difficulty}: ${actual} / ${expected}`;
})).join("\n")}

## Topic Quota Checks

${topics.filter((topic) => grades.includes(topic.grade)).map((topic) => {
  const expected = topicCountsByGrade[topic.grade];
  const actual = topicCounts[topic.id] ?? 0;
  return `- ${topic.grade} ${topic.id}: ${actual} / ${expected}`;
}).join("\n")}

## Manual QA Status

- \`mathQaStatus\`: kept as \`pending-manual\` because full human-style solving of 2100 high-school items is a separate S18 review pass.
- Required manual review queue: ${manualReviewQueue.length} rows, including at least 10 balanced samples per topic plus any automatic red-flag or near-template rows.
- Required next step before app integration: S18 manually solve/review at least 10 questions per topic, plus every auto-flagged row.

## Validation Issues

${validationIssues.length ? validationIssues.map((issue) => `- ${issue}`).join("\n") : "- None."}

## Files

- \`questions.jsonl\`
- \`questions.csv\`
- \`coverage-matrix.csv\`
- \`manual-review-queue.csv\`
- \`qa-report.md\`
- \`generate-with-deepseek.mjs\`
- \`batches/*.json\` resumable parsed batch cache
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

async function main() {
  loadEnvFile(path.join(rootDir, ".env.local"));
  const apiKey = process.env.LLM_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim();
  const apiUrl = process.env.LLM_API_URL?.trim() || "https://api.deepseek.com/chat/completions";
  const model = process.env.LLM_MODEL?.trim() || "deepseek-v4-pro";
  const concurrency = Math.max(1, Math.min(4, Number(process.env.MAINLAND_HIGH_DEEPSEEK_CONCURRENCY ?? 2) || 2));
  if (!apiKey) throw new Error("Missing LLM_API_KEY or OPENAI_API_KEY in local environment");
  if (!new URL(apiUrl).host.includes("api.deepseek.com")) {
    throw new Error(`Refusing to run non-DeepSeek endpoint for this task: ${new URL(apiUrl).host}`);
  }
  if (model !== "deepseek-v4-pro") {
    throw new Error(`Refusing to run non-DeepSeek V4 Pro model for this task: ${model}`);
  }

  fs.mkdirSync(batchDir, { recursive: true });
  const startedAt = new Date().toISOString();
  const moduleCache = new Map();
  const topics = loadTsModule(path.join(rootDir, "data/mainlandPepHighTopics.ts"), moduleCache).mainlandPepHighTopics;
  const ragCards = loadTsModule(path.join(rootDir, "data/rag/mainlandPepHigh.ts"), moduleCache).mainlandPepHighRagCards;
  const patternCards = loadTsModule(path.join(rootDir, "data/rag/mainlandPepHighExamPatterns.ts"), moduleCache).mainlandPepHighExamPatternCards;
  const plan = buildPlan(topics, ragCards, patternCards);
  const batches = chunk(plan, 10);
  const results = new Array(batches.length);
  const failures = [];
  let nextBatchIndex = 0;

  console.log(`DeepSeek high-school generation starting: ${batches.length} batches, concurrency=${concurrency}, model=${model}, endpoint=${new URL(apiUrl).host}`);

  async function worker(workerIndex) {
    while (nextBatchIndex < batches.length) {
      const index = nextBatchIndex;
      nextBatchIndex += 1;
      const targets = batches[index];
      const batchId = batchIdFor(targets);
      console.log(`worker ${workerIndex}: batch ${index + 1}/${batches.length}: ${batchId}`);
      try {
        results[index] = await generateBatch({ targets, ragCards, patternCards, apiUrl, apiKey, model });
      } catch (error) {
        const message = String(error?.message ?? error).replace(/sk-[A-Za-z0-9]+/g, "[REDACTED_API_KEY]");
        failures.push({ index: index + 1, batchId, message });
        console.error(`worker ${workerIndex}: batch ${index + 1}/${batches.length} failed: ${message}`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, (_, index) => worker(index + 1)));

  if (failures.length) {
    fs.writeFileSync(path.join(__dirname, "generation-failures.json"), `${JSON.stringify({ generatedAt: new Date().toISOString(), failures }, null, 2)}\n`);
    throw new Error(`${failures.length} batch(es) failed. Cached successful batches are preserved; rerun the script to retry missing batches.`);
  }

  const failurePath = path.join(__dirname, "generation-failures.json");
  if (fs.existsSync(failurePath)) fs.rmSync(failurePath);

  const questions = results.flat();

  questions.sort((a, b) => a.id.localeCompare(b.id));
  const existingPrompts = existingHighPromptSet();
  const validationIssues = validateFullPackage({ questions, plan, topics, ragCards, patternCards, existingPrompts });
  const coverageRows = buildCoverageRows(questions);
  const manualReviewQueue = buildManualReviewQueue(questions);

  writeJsonl(path.join(__dirname, "questions.jsonl"), questions);
  writeCsv(path.join(__dirname, "questions.csv"), questions, requiredColumns);
  writeCsv(path.join(__dirname, "coverage-matrix.csv"), coverageRows, [
    "grade",
    "topicId",
    "topicTitleZhHans",
    "chapter",
    "type",
    "difficulty",
    "count",
    "evidenceCardIds",
    "examPatternCardIds"
  ]);
  writeCsv(path.join(__dirname, "manual-review-queue.csv"), manualReviewQueue, requiredColumns);
  fs.writeFileSync(path.join(__dirname, "qa-report.md"), buildQaReport({
    questions,
    plan,
    topics,
    ragCards,
    patternCards,
    model,
    apiUrl,
    startedAt,
    finishedAt: new Date().toISOString(),
    validationIssues,
    manualReviewQueue
  }));

  console.log("DeepSeek generation complete: wrote questions.jsonl, questions.csv, coverage-matrix.csv, manual-review-queue.csv, qa-report.md");
  if (validationIssues.length) {
    console.error(`Validation failed with ${validationIssues.length} issue(s). See qa-report.md.`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
