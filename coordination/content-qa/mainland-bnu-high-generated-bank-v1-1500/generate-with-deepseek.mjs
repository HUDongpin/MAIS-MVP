import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../../..");
const batchDir = path.join(__dirname, "batches");

const grades = ["S4", "S5", "S6"];
const questionTypes = ["multiple-choice", "fill-in", "short-answer"];
const difficulties = ["Foundation", "Core", "Exam", "Challenge"];
const gradeQuestionCount = 500;
const totalQuestionCount = 1500;
const batchSize = Number(process.env.BNU_HIGH_GENERATION_BATCH_SIZE ?? 10);
const generationConcurrency = Number(process.env.BNU_HIGH_GENERATION_CONCURRENCY ?? 4);
const packageVersion = "v1";
const packageLabel = "Mainland BNU High Generated Bank V1";

const typeQuotaByGrade = {
  "multiple-choice": 175,
  "fill-in": 150,
  "short-answer": 175
};

const difficultyQuotaByGrade = {
  S4: { Foundation: 150, Core: 230, Exam: 90, Challenge: 30 },
  S5: { Foundation: 90, Core: 230, Exam: 130, Challenge: 50 },
  S6: { Foundation: 50, Core: 180, Exam: 190, Challenge: 80 }
};

const forbiddenSourcePattern =
  /OCR|PDF|DOCX|docx|zip|截图|扫描|页码|第\s*\d+\s*页|教材原题|课本原题|试卷原题|原文|源文件|来源文件|改编自|摘自|如图|见图|上图|下图|右图|左图|(^|[，。；：、\s])图中/i;
const mathRedFlagPattern =
  /设计有误|选项中没有|没有正确答案|无法确定|重新计算|但选项|但题目|假设图中|答案不唯一|可能有误|题目误写|重新生成|我将|根据输出要求|缺少条件|缺少图|不够条件/i;
const genericStemPattern =
  /^(下面哪句(?:话)?是正确的[？?]?$|下面哪种说法是正确的[？?]?$|下列说法(?:中)?，?正确的是(?:哪一项)?[？?]?$|下面说法正确的是\s*[（(]\s*[）)]。?$)/;

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
  let source = fs.readFileSync(filePath, "utf8");
  source = source
    .replace(/^import\s+.*;\s*$/gm, "")
    .replace(/\b(const|let|var)\s+([A-Za-z_$][\w$]*)\s*:\s*[^=;]+=/g, "$1 $2 =")
    .replace(/\s+as\s+const\b/g, "")
    .replace(/\s+as\s+[A-Za-z_$][\w$]*(?:\[\])?/g, "")
    .replace(new RegExp(`export const ${exportName}(?:: [^=]+)? =`), `exports.${exportName} =`)
    .replace(/export const ([A-Za-z_$][\w$]*)(?:: [^=]+)? =/g, "const $1 =");
  const context = { exports: {} };
  vm.runInNewContext(source, context, { filename: filePath });
  return context.exports[exportName];
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[\s\-_/，、。,.()[\]（）:：;；·+【】]+/g, "");
}

function conceptOverlap(left = [], right = []) {
  const rightSet = new Set(right.map(normalize));
  return left.map(normalize).filter((value) => rightSet.has(value)).length;
}

function titleOverlap(title, candidates = []) {
  const normalizedTitle = normalize(title);
  return candidates.some((candidate) => {
    const normalizedCandidate = normalize(candidate);
    return normalizedCandidate.includes(normalizedTitle) || normalizedTitle.includes(normalizedCandidate);
  });
}

function balancedSequence(counts) {
  const remaining = new Map(Object.entries(counts));
  const result = [];
  while (Array.from(remaining.values()).some((count) => count > 0)) {
    const next = Array.from(remaining.entries())
      .filter(([, count]) => count > 0)
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
    for (const [key, count] of next) {
      result.push(key);
      remaining.set(key, count - 1);
    }
  }
  return result;
}

function distribute(total, slots) {
  const base = Math.floor(total / slots);
  const remainder = total % slots;
  return Array.from({ length: slots }, (_, index) => base + (index < remainder ? 1 : 0));
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72);
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

function compactAssessmentCard(card) {
  return {
    id: card.id,
    volumeScope: card.volumeScope,
    grades: card.grades,
    semesters: card.semesters,
    assessmentFamilies: card.assessmentFamilies,
    materialKinds: card.materialKinds,
    unitTitles: card.unitTitles,
    chapters: card.chapters,
    conceptIds: card.conceptIds,
    competencyTags: card.competencyTags,
    skillTags: card.skillTags,
    itemTypeTags: card.itemTypeTags,
    difficultyBand: card.difficultyBand,
    patternSummary: card.patternSummary,
    solutionStrategyTags: card.solutionStrategyTags,
    misconceptionTags: card.misconceptionTags,
    generationGuidance: card.generationGuidance,
    prohibitedReuseNotes: card.prohibitedReuseNotes
  };
}

function scoreAssessmentCard(card, scope) {
  return (
    (card.grades?.includes(scope.grade) ? 30 : 0) +
    (card.semesters?.includes(scope.semester) || card.semesters?.includes("full-year") ? 14 : 0) +
    (card.chapters?.includes(scope.chapter) || titleOverlap(scope.chapter, card.chapters) ? 24 : 0) +
    (titleOverlap(scope.topicTitleZhHans, card.unitTitles) ? 12 : 0) +
    conceptOverlap(scope.conceptIds, card.conceptIds ?? []) * 8 +
    (scope.difficulty === "Exam" && card.assessmentFamilies?.some((family) => /final|midterm|gaokao|comprehensive/.test(family)) ? 5 : 0) +
    (scope.difficulty === "Challenge" && card.difficultyBand === "challenge" ? 5 : 0)
  );
}

function pickAssessmentCards(assessmentCards, scope, limit = 3) {
  const scored = assessmentCards
    .map((card, index) => ({ card, index, score: scoreAssessmentCard(card, scope) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index);
  const fallback = assessmentCards
    .map((card, index) => ({ card, index, score: card.grades?.includes(scope.grade) ? 1 : 0 }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      const leftIntegrated = left.card.assessmentFamilies?.some((family) => /final|midterm|comprehensive|gaokao/.test(family)) ? 1 : 0;
      const rightIntegrated = right.card.assessmentFamilies?.some((family) => /final|midterm|comprehensive|gaokao/.test(family)) ? 1 : 0;
      return rightIntegrated - leftIntegrated || left.index - right.index;
    });
  return (scored.length ? scored : fallback).slice(0, limit).map((entry) => entry.card);
}

function scopeFromCard(card, count) {
  return {
    grade: card.grades[0],
    semester: card.semesters[0] ?? "full-year",
    topicTitleZhHans: card.chapter,
    volume: card.volume,
    chapter: card.chapter,
    count,
    evidenceCards: [card]
  };
}

function buildScopeDefinitions(curriculumCards) {
  const byGrade = Object.fromEntries(
    grades.map((grade) => [grade, curriculumCards.filter((card) => card.grades?.includes(grade))])
  );
  if (byGrade.S4.length !== 14) throw new Error(`Expected 14 BNU high S4 safe cards; found ${byGrade.S4.length}`);
  if (byGrade.S5.length !== 7) throw new Error(`Expected 7 BNU high S5 safe cards; found ${byGrade.S5.length}`);
  if (byGrade.S6.length !== 2) throw new Error(`Expected 2 BNU high S6 safe cards; found ${byGrade.S6.length}`);

  const s4Counts = distribute(gradeQuestionCount, byGrade.S4.length);
  const s5Counts = distribute(gradeQuestionCount, byGrade.S5.length);
  const [sequenceCard, derivativeCard] = byGrade.S6;
  return {
    S4: byGrade.S4.map((card, index) => scopeFromCard(card, s4Counts[index])),
    S5: byGrade.S5.map((card, index) => scopeFromCard(card, s5Counts[index])),
    S6: [
      scopeFromCard(sequenceCard, 225),
      scopeFromCard(derivativeCard, 225),
      {
        grade: "S6",
        semester: "full-year",
        topicTitleZhHans: "高三数列与导数综合复习",
        volume: "选择性必修 第二册综合复习",
        chapter: "高三数列与导数综合复习",
        count: 50,
        evidenceCards: [sequenceCard, derivativeCard]
      }
    ]
  };
}

function buildPlan({ curriculumCards, assessmentCards }) {
  const scopesByGrade = buildScopeDefinitions(curriculumCards);
  const gradeIndexes = new Map(grades.map((grade) => [grade, 0]));
  const typePlans = Object.fromEntries(grades.map((grade) => [grade, balancedSequence(typeQuotaByGrade)]));
  const difficultyPlans = Object.fromEntries(grades.map((grade) => [grade, balancedSequence(difficultyQuotaByGrade[grade])]));
  const rows = [];

  for (const grade of grades) {
    const scopes = scopesByGrade[grade];
    const scopedTotal = scopes.reduce((sum, scope) => sum + scope.count, 0);
    if (scopedTotal !== gradeQuestionCount) throw new Error(`${grade} scope total ${scopedTotal}; expected ${gradeQuestionCount}`);
    for (const scope of scopes) {
      for (let localIndex = 0; localIndex < scope.count; localIndex += 1) {
        const gradeIndex = gradeIndexes.get(grade) ?? 0;
        const conceptIds = unique(scope.evidenceCards.flatMap((card) => card.conceptIds)).slice(0, 10);
        const scopeForAssessment = {
          ...scope,
          conceptIds,
          type: typePlans[grade][gradeIndex],
          difficulty: difficultyPlans[grade][gradeIndex]
        };
        const pickedAssessmentCards = pickAssessmentCards(assessmentCards, scopeForAssessment, 3);
        if (!pickedAssessmentCards.length) throw new Error(`Missing BNU high assessment pattern evidence for ${grade} ${scope.chapter}`);
        const id = `bnu-high-ds-${packageVersion}-${grade.toLowerCase()}-${String(gradeIndex + 1).padStart(3, "0")}`;
        rows.push({
          id,
          batch: "bnu-high-v1",
          grade,
          semester: scope.semester,
          topicId: `bnu-high-${grade.toLowerCase()}-${slugify(scope.topicTitleZhHans)}`,
          topicTitleZhHans: scope.topicTitleZhHans,
          volume: scope.volume,
          chapter: scope.chapter,
          conceptIds,
          competencyTags: unique(scope.evidenceCards.flatMap((card) => card.competencyTags)).slice(0, 6),
          skillTags: unique(pickedAssessmentCards.flatMap((card) => card.skillTags ?? [])).slice(0, 8),
          misconceptionTags: unique([
            ...scope.evidenceCards.flatMap((card) => card.misconceptionTags ?? []),
            ...pickedAssessmentCards.flatMap((card) => card.misconceptionTags ?? [])
          ]).slice(0, 8),
          difficulty: difficultyPlans[grade][gradeIndex],
          type: typePlans[grade][gradeIndex],
          evidenceCardIds: scope.evidenceCards.map((card) => card.id),
          assessmentPatternCardIds: pickedAssessmentCards.map((card) => card.id),
          sourceDistanceStatus: "pending-generation",
          mathQaStatus: "pending-generation",
          terminologyQaStatus: "pending-generation",
          manualQaStatus: "pending-generation",
          reviewNotes: "Generation target built from committed BNU high-school safe-RAG metadata only."
        });
        gradeIndexes.set(grade, gradeIndex + 1);
      }
    }
  }

  if (rows.length !== totalQuestionCount) throw new Error(`Plan row count ${rows.length}; expected ${totalQuestionCount}`);
  for (const grade of grades) {
    const count = rows.filter((row) => row.grade === grade).length;
    if (count !== gradeQuestionCount) throw new Error(`${grade} has ${count}; expected ${gradeQuestionCount}`);
  }
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

function systemPrompt() {
  return [
    "你是 MAIS 的高中数学原创题生成与审核专家。",
    "任务是根据安全 RAG 摘要生成内地北师大版高中数学原创题。",
    "必须使用简体中文与内地高中数学术语。",
    "只能依据安全摘要、概念标签、能力标签、误区标签和题型模式生成全新题目。",
    "不得复制、改写、翻译、近似重构教材、练习册、试卷、答案、图表、页面、版式或解法原文。",
    "不得提到来源文件、PDF、DOCX、OCR、页码、截图、试卷原题、教材原题或任何 source locator。",
    "不要写“如图”“见图”“上图”“下图”“右图”“左图”“图中”。题目若需要几何、图像、表格或数据，必须用文字完整描述，使学生不依赖外部图片即可作答。",
    "这是北师大版高中 V1 候选题包；必须体现北师大高中章节顺序与安全证据，但题面、数值、语境、选项和解析必须是 MAIS 原创。",
    "每题必须唯一可解；选择题只有一个正确选项，answer 必须与某一个 optionsZhHans 字符串完全相同。",
    "填空题和简答题不要给选项，answer 使用一个简洁规范的标准答案。",
    "解释必须直接推出 answer 字段，不能与答案或选项矛盾。",
    "解析控制在180个汉字以内，不要写模型思考、纠错、自我提醒、题目修改建议或生成过程。",
    "只输出 JSON object，不要 Markdown，不要代码块。"
  ].join("\n");
}

function userPrompt({ targets, textbookCards, assessmentCards }) {
  return JSON.stringify({
    task: `Generate exactly ${targets.length} original Beijing Normal University Press high-school math questions.`,
    outputContract: {
      root: "questions",
      perQuestionFields: ["id", "promptZhHans", "optionsZhHans", "answer", "acceptedAnswers", "explanationZhHans"],
      rules: [
        "Return exactly one JSON object: {\"questions\":[...items...]}",
        "Use each target id exactly once.",
        "Do not add, remove, rename, or reorder target ids.",
        "For multiple-choice, optionsZhHans must contain exactly 4 different strings and answer must exactly equal one option.",
        "For fill-in and short-answer, optionsZhHans must be an empty array.",
        "acceptedAnswers must include the canonical answer.",
        "Use only the target grade, topicTitleZhHans, volume, chapter, conceptIds, type, and difficulty.",
        "Use fresh numbers, mathematical objects, contexts, and distractors.",
        "Do not copy examples, exercise wording, page language, diagram layout, or worked-solution phrasing.",
        "Do not use external diagrams; any graph, solid, sequence, table, or data set must be fully described in text.",
        "Keep the questions suitable for the specified high-school grade and chapter."
      ]
    },
    targets: targets.map((target) => ({
      id: target.id,
      grade: target.grade,
      topicTitleZhHans: target.topicTitleZhHans,
      volume: target.volume,
      chapter: target.chapter,
      conceptIds: target.conceptIds,
      competencyTags: target.competencyTags,
      skillTags: target.skillTags,
      misconceptionTags: target.misconceptionTags,
      difficulty: target.difficulty,
      type: target.type
    })),
    safeBnuTextbookEvidence: textbookCards.map(compactTextbookCard),
    safeBnuAssessmentPatternEvidence: assessmentCards.map(compactAssessmentCard)
  });
}

function extractJsonObject(text) {
  const trimmed = text.trim();
  const match = trimmed.startsWith("{") && trimmed.endsWith("}") ? [trimmed] : trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object found in provider reply");
  const candidates = [match[0], match[0].replace(/\\(?!["\\/bfnrtu])/g, "\\\\")];
  let lastError = null;
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
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
    max_tokens: 7000,
    temperature: 0.36
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
      if ((response.status === 429 || response.status >= 500) && attempt < 4) {
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
    mathQaStatus: "pending-s18-review",
    terminologyQaStatus: "pending-s18-review",
    manualQaStatus: "pending-s18-review",
    reviewNotes: "Generated offline with DeepSeek V4 Pro from MAIS BNU high-school safe-RAG metadata only; candidate QA package only, not approved for public integration."
  };

  if (forbiddenSourcePattern.test(sourceRiskText(normalized))) errors.push("forbidden source or missing-visual wording detected");
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

async function generateWithPrompt({ targets, textbookCards, assessmentCards, apiUrl, apiKey, model }) {
  const messages = [
    { role: "system", content: systemPrompt() },
    { role: "user", content: userPrompt({ targets, textbookCards, assessmentCards }) }
  ];
  const content = await postDeepSeek({ apiUrl, apiKey, model, messages });
  const parsed = extractJsonObject(content);
  return validateBatch(targets, parsed.questions);
}

async function generateBatch({ targets, batchIndex, curriculumCards, assessmentCards, apiUrl, apiKey, model }) {
  const batchId = batchIdFor(batchIndex);
  const cachePath = path.join(batchDir, `${batchId}.json`);
  if (fs.existsSync(cachePath)) {
    const cached = JSON.parse(fs.readFileSync(cachePath, "utf8"));
    const normalized = validateBatch(targets, cached.questions);
    fs.writeFileSync(cachePath, `${JSON.stringify({ batchId, questions: normalized }, null, 2)}\n`);
    return normalized;
  }

  const evidenceCardIds = unique(targets.flatMap((target) => target.evidenceCardIds));
  const assessmentPatternCardIds = unique(targets.flatMap((target) => target.assessmentPatternCardIds));
  const textbookCards = curriculumCards.filter((card) => evidenceCardIds.includes(card.id));
  const pickedAssessmentCards = assessmentCards.filter((card) => assessmentPatternCardIds.includes(card.id));
  let lastError = null;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const normalized = await generateWithPrompt({
        targets,
        textbookCards,
        assessmentCards: pickedAssessmentCards,
        apiUrl,
        apiKey,
        model
      });
      fs.writeFileSync(cachePath, `${JSON.stringify({ batchId, questions: normalized }, null, 2)}\n`);
      return normalized;
    } catch (error) {
      lastError = error;
      await sleep(1200 * (attempt + 1));
    }
  }

  console.log(`${batchId} falling back to single-target DeepSeek retries after batch validation failure.`);
  const normalized = [];
  for (const target of targets) {
    const singleTextbookCards = curriculumCards.filter((card) => target.evidenceCardIds.includes(card.id));
    const singleAssessmentCards = assessmentCards.filter((card) => target.assessmentPatternCardIds.includes(card.id));
    let singleQuestion = null;
    let singleError = null;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      try {
        [singleQuestion] = await generateWithPrompt({
          targets: [target],
          textbookCards: singleTextbookCards,
          assessmentCards: singleAssessmentCards,
          apiUrl,
          apiKey,
          model
        });
        break;
      } catch (error) {
        singleError = error;
        await sleep(1200 * (attempt + 1));
      }
    }
    if (!singleQuestion) {
      throw new Error(
        `${batchId} failed after batch and single-target retries; last batch error: ${lastError?.message ?? lastError}; single error: ${singleError?.message ?? singleError}`
      );
    }
    normalized.push(singleQuestion);
  }
  fs.writeFileSync(cachePath, `${JSON.stringify({ batchId, generationMode: "single-target-retry", questions: normalized }, null, 2)}\n`);
  return normalized;
}

function csvEscape(value) {
  const text = Array.isArray(value) ? value.join(" | ") : String(value ?? "");
  return `"${text.replace(/"/g, '""').replace(/\r?\n/g, "\\n")}"`;
}

function writeCsv(filePath, rows, headers) {
  const lines = [headers.map(csvEscape).join(","), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(","))];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function writeJsonl(filePath, rows) {
  fs.writeFileSync(filePath, `${rows.map((row) => JSON.stringify(row)).join("\n")}\n`);
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
  const groups = new Map();
  for (const question of questions) {
    const key = [question.grade, question.semester, question.topicId, question.type, question.difficulty].join("::");
    const current = groups.get(key) ?? {
      grade: question.grade,
      semester: question.semester,
      topicId: question.topicId,
      topicTitleZhHans: question.topicTitleZhHans,
      volume: question.volume,
      chapter: question.chapter,
      type: question.type,
      difficulty: question.difficulty,
      count: 0,
      evidenceCardIds: question.evidenceCardIds,
      assessmentPatternCardIds: question.assessmentPatternCardIds
    };
    current.count += 1;
    groups.set(key, current);
  }
  return Array.from(groups.values()).sort(
    (left, right) =>
      left.grade.localeCompare(right.grade) ||
      left.topicId.localeCompare(right.topicId) ||
      left.type.localeCompare(right.type) ||
      left.difficulty.localeCompare(right.difficulty)
  );
}

function buildQaReport({ questions, plan, model, apiUrl, startedAt, finishedAt, curriculumCards, assessmentCards }) {
  const gradeCounts = Object.fromEntries(countBy(questions, (question) => question.grade));
  const typeCounts = Object.fromEntries(countBy(questions, (question) => `${question.grade}-${question.type}`));
  const difficultyCounts = Object.fromEntries(countBy(questions, (question) => `${question.grade}-${question.difficulty}`));
  const duplicateIds = Array.from(countBy(questions, (question) => question.id).entries()).filter(([, count]) => count > 1).map(([id]) => id);
  const duplicatePrompts = Array.from(countBy(questions, (question) => question.promptZhHans.replace(/\s+/g, "")).entries()).filter(([, count]) => count > 1).length;
  const sourceRiskRows = questions.filter((question) => question.sourceDistanceStatus !== "passed-auto-source-scan");
  const missingEvidenceRows = questions.filter((question) => !question.evidenceCardIds.length || !question.assessmentPatternCardIds.length);
  const malformedMcRows = questions.filter((question) => question.type === "multiple-choice" && (question.optionsZhHans.length !== 4 || !question.optionsZhHans.includes(question.answer)));
  const missingAcceptedRows = questions.filter((question) => !question.acceptedAnswers.length);
  const missingExplanationRows = questions.filter((question) => !question.explanationZhHans.trim());
  const allChecksPass =
    questions.length === totalQuestionCount &&
    grades.every((grade) => gradeCounts[grade] === gradeQuestionCount) &&
    grades.every((grade) => questionTypes.every((type) => (typeCounts[`${grade}-${type}`] ?? 0) === typeQuotaByGrade[type])) &&
    grades.every((grade) => difficulties.every((difficulty) => (difficultyCounts[`${grade}-${difficulty}`] ?? 0) === difficultyQuotaByGrade[grade][difficulty])) &&
    duplicateIds.length === 0 &&
    duplicatePrompts === 0 &&
    missingEvidenceRows.length === 0 &&
    malformedMcRows.length === 0 &&
    missingAcceptedRows.length === 0 &&
    missingExplanationRows.length === 0 &&
    sourceRiskRows.length === 0;

  return `# ${packageLabel} Candidate QA Report

- Date: 2026-05-27
- Session ID: S18
- Generator: DeepSeek API via local server-side \`LLM_API_KEY\` or \`OPENAI_API_KEY\` from \`.env.local\`
- Model: \`${model}\`
- API host: \`${new URL(apiUrl).host}\`
- Started: ${startedAt}
- Finished: ${finishedAt}
- Verdict: ${allChecksPass ? "Auto structure/count/schema QA passed for the offline candidate package; S18 audit-solvability and manual sampling gates still required before app integration." : "Needs remediation before use."}

## Scope

- Generated ${questions.length} original Simplified Chinese questions for Mainland Beijing Normal University Press high-school mathematics.
- Distribution target: 500 questions per S4, S5, and S6 grade.
- This package is candidate-only. It must not be connected to public practice, lessons, APIs, adaptive recommendations, or production data in this task.
- RAG evidence source: ${curriculumCards.length} committed BNU high-school textbook safe cards and ${assessmentCards.length} committed BNU high-school assessment-pattern cards.
- Coverage plan rows: ${plan.length}.

## Secret Hygiene

- The script read the provider key locally and sent it only as an Authorization header.
- No API key, request header, raw prompt transcript, source file path, OCR text, page image, page number, or source locator is written into these artifacts.
- Batch cache files contain parsed generated questions only.

## Count Checks

- Total questions: ${questions.length} / ${totalQuestionCount}.
- Duplicate IDs: ${duplicateIds.length ? duplicateIds.join(", ") : "none"}.
- Duplicate exact prompts: ${duplicatePrompts}.
- Missing evidence rows: ${missingEvidenceRows.length}.
- Source-distance risk rows: ${sourceRiskRows.length}.
- Malformed multiple-choice rows: ${malformedMcRows.length}.
- Missing accepted-answer rows: ${missingAcceptedRows.length}.
- Missing explanation rows: ${missingExplanationRows.length}.

## Grade Counts

${grades.map((grade) => `- ${grade}: ${gradeCounts[grade] ?? 0} / ${gradeQuestionCount}`).join("\n")}

## Type Quota Checks

${grades.flatMap((grade) => questionTypes.map((type) => `- ${grade} ${type}: ${typeCounts[`${grade}-${type}`] ?? 0} / ${typeQuotaByGrade[type]}`)).join("\n")}

## Difficulty Quota Checks

${grades.flatMap((grade) => difficulties.map((difficulty) => `- ${grade} ${difficulty}: ${difficultyCounts[`${grade}-${difficulty}`] ?? 0} / ${difficultyQuotaByGrade[grade][difficulty]}`)).join("\n")}

## Manual QA Status

- \`mathQaStatus\`, \`terminologyQaStatus\`, and \`manualQaStatus\` remain \`pending-s18-review\`.
- Required next step for candidate QA: run \`node coordination/content-qa/mainland-bnu-high-generated-bank-v1-1500/audit-solvability.mjs\`.
- Any later app integration requires explicit S04/S18 coordination and separate question-bank tests.
`;
}

async function main() {
  const smoke = process.argv.includes("--smoke");
  loadEnvFile(path.join(rootDir, ".env.local"));
  const apiKey = process.env.LLM_API_KEY?.trim() || process.env.OPENAI_API_KEY?.trim();
  const apiUrl = process.env.LLM_API_URL?.trim() || "https://api.deepseek.com/chat/completions";
  const model = process.env.LLM_MODEL?.trim() || "deepseek-v4-pro";
  const startedAt = new Date().toISOString();

  if (!apiKey) throw new Error("Missing LLM_API_KEY or OPENAI_API_KEY in local environment");
  if (!new URL(apiUrl).host.includes("api.deepseek.com")) throw new Error(`Refusing non-DeepSeek endpoint for this task: ${new URL(apiUrl).host}`);
  if (model !== "deepseek-v4-pro") throw new Error(`Refusing non-DeepSeek V4 Pro model for this task: ${model}`);
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 20) throw new Error(`Invalid BNU_HIGH_GENERATION_BATCH_SIZE: ${batchSize}`);
  if (!Number.isInteger(generationConcurrency) || generationConcurrency < 1 || generationConcurrency > 8) {
    throw new Error(`Invalid BNU_HIGH_GENERATION_CONCURRENCY: ${generationConcurrency}`);
  }

  const curriculumCards = loadTsExport(path.join(rootDir, "data/rag/mainlandBnuHigh.ts"), "mainlandBnuHighRagCards");
  const assessmentCards = loadTsExport(path.join(rootDir, "data/rag/mainlandBnuHighAssessmentPatterns.ts"), "mainlandBnuHighAssessmentPatternCards");
  const plan = buildPlan({ curriculumCards, assessmentCards });
  fs.mkdirSync(batchDir, { recursive: true });

  if (process.argv.includes("--plan-only")) {
    writeJsonl(path.join(__dirname, "generation-plan.jsonl"), plan);
    writeCsv(path.join(__dirname, "generation-plan.csv"), plan, [
      "id",
      "batch",
      "grade",
      "semester",
      "topicId",
      "topicTitleZhHans",
      "volume",
      "chapter",
      "conceptIds",
      "competencyTags",
      "skillTags",
      "misconceptionTags",
      "difficulty",
      "type",
      "evidenceCardIds",
      "assessmentPatternCardIds",
      "sourceDistanceStatus",
      "mathQaStatus",
      "terminologyQaStatus",
      "manualQaStatus",
      "reviewNotes"
    ]);
    console.log(`Plan-only complete: ${plan.length} rows.`);
    return;
  }

  const batches = chunk(plan, batchSize);
  const activeBatches = smoke ? batches.slice(0, 1) : batches;
  const batchResults = new Array(activeBatches.length);
  const workerCount = smoke ? 1 : Math.min(generationConcurrency, activeBatches.length);
  let nextBatchIndex = 0;

  console.log(`DeepSeek generation starting: ${activeBatches.length}/${batches.length} batches, model=${model}, endpoint=${new URL(apiUrl).host}, concurrency=${workerCount}`);
  async function runWorker(workerIndex) {
    while (nextBatchIndex < activeBatches.length) {
      const index = nextBatchIndex;
      nextBatchIndex += 1;
      const targets = activeBatches[index];
      console.log(`worker ${workerIndex + 1}/${workerCount} batch ${index + 1}/${activeBatches.length}: ${batchIdFor(index)} ${targets[0].grade} ${targets[0].topicTitleZhHans}`);
      batchResults[index] = await generateBatch({
        targets,
        batchIndex: index,
        curriculumCards,
        assessmentCards,
        apiUrl,
        apiKey,
        model
      });
    }
  }

  await Promise.all(Array.from({ length: workerCount }, (_, index) => runWorker(index)));
  const questions = batchResults.flat();

  if (smoke) {
    fs.writeFileSync(
      path.join(__dirname, "smoke-test-report.md"),
      `# Mainland BNU High DeepSeek Smoke Test

- Date: 2026-05-27
- Session ID: S18
- Model: \`${model}\`
- API host: \`${new URL(apiUrl).host}\`
- Batch size: ${batchSize}
- Generated rows: ${questions.length}
- Result: passed local batch validation
- Secret hygiene: no key, request header, raw prompt transcript, source locator, or provider transcript is written.
`
    );
    console.log("Smoke test complete: wrote smoke-test-report.md and validated batch cache.");
    return;
  }

  questions.sort((left, right) => left.id.localeCompare(right.id));
  writeJsonl(path.join(__dirname, "questions.jsonl"), questions);
  writeCsv(path.join(__dirname, "questions.csv"), questions, [
    "id",
    "batch",
    "grade",
    "semester",
    "topicId",
    "topicTitleZhHans",
    "volume",
    "chapter",
    "conceptIds",
    "competencyTags",
    "skillTags",
    "misconceptionTags",
    "difficulty",
    "type",
    "promptZhHans",
    "optionsZhHans",
    "answer",
    "acceptedAnswers",
    "explanationZhHans",
    "evidenceCardIds",
    "assessmentPatternCardIds",
    "sourceDistanceStatus",
    "mathQaStatus",
    "terminologyQaStatus",
    "manualQaStatus",
    "reviewNotes"
  ]);
  writeCsv(path.join(__dirname, "coverage-matrix.csv"), buildCoverageRows(questions), [
    "grade",
    "semester",
    "topicId",
    "topicTitleZhHans",
    "volume",
    "chapter",
    "type",
    "difficulty",
    "count",
    "evidenceCardIds",
    "assessmentPatternCardIds"
  ]);
  fs.writeFileSync(path.join(__dirname, "question-pack.json"), `${JSON.stringify({ questions }, null, 2)}\n`);
  fs.writeFileSync(
    path.join(__dirname, "qa-report.md"),
    buildQaReport({
      questions,
      plan,
      model,
      apiUrl,
      startedAt,
      finishedAt: new Date().toISOString(),
      curriculumCards,
      assessmentCards
    })
  );
  console.log("Generation complete: wrote questions.jsonl, questions.csv, question-pack.json, coverage-matrix.csv, qa-report.md");
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
